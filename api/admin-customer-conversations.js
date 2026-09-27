const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const GOOGLE_APPS_SCRIPT_SECRET = process.env.GOOGLE_APPS_SCRIPT_SECRET;

const APPS_SCRIPT_REQUEST_HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
};

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 11) {
    digits = `63${digits.slice(1)}`;
  }

  if (digits.startsWith("9") && digits.length === 10) {
    digits = `63${digits}`;
  }

  return digits;
}

function normalizeMessage(rawMessage, index) {
  const message = rawMessage || {};

  return {
    id:
      message.id ||
      message.messageId ||
      message.reference ||
      message.ref ||
      `sms-${index}`,
    text:
      message.text ||
      message.message ||
      message.body ||
      message.content ||
      "",
    date:
      message.date ||
      message.createdAt ||
      message.created_at ||
      message.timestamp ||
      message.sentAt ||
      message.sent_at ||
      "",
    direction: String(
      message.direction ||
        message.type ||
        message.messageType ||
        message.smsType ||
        "outbound"
    ).toLowerCase().includes("in")
      ? "inbound"
      : "outbound",
    status:
      message.status ||
      message.deliveryStatus ||
      message.delivery_status ||
      message.state ||
      "unknown",
  };
}

function getMessagesFromPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.messages)) {
    return payload.messages;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  return [];
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({
      error: "Method not allowed.",
    });
  }

  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_SECRET) {
    return response.status(500).json({
      error: "Apps Script connection is not configured.",
    });
  }

  const phone = String(request.query.phone || "").trim();
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return response.status(400).json({
      error: "A customer mobile number is required.",
    });
  }

const appsScriptUrl = new URL(
  "https://script.google.com/macros/s/AKfycbwbXNv2bygfxAxtLjMTzhcVIZYxyvvYVFI7wWlSRoOM9rC6oztoi-Yka3DKsNNJLnxYOA/exec"
);  appsScriptUrl.searchParams.set("action", "philsms_history");
  appsScriptUrl.searchParams.set("secret", GOOGLE_APPS_SCRIPT_SECRET);
  appsScriptUrl.searchParams.set("phone", phone);

console.log("Apps Script URL being called:", appsScriptUrl.toString());

  try {
    const appsScriptResponse = await fetch(appsScriptUrl.toString(), {
      method: "GET",
      headers: APPS_SCRIPT_REQUEST_HEADERS,
    });

    const text = await appsScriptResponse.text();

    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {
        error: text,
      };
    }

    if (!appsScriptResponse.ok || payload?.ok === false) {
      return response.status(502).json({
        error:
          payload?.error ||
          payload?.message ||
          "Could not load PhilSMS conversation history.",
      });
    }

    const rawMessages = getMessagesFromPayload(payload);

console.log("Apps Script payload:", JSON.stringify(payload).slice(0, 3000));
console.log("Raw messages count:", rawMessages.length);
console.log("Raw messages sample:", JSON.stringify(rawMessages[0] || null));

    const messages = rawMessages
  .map(normalizeMessage)
  .sort((a, b) => {
    const first = new Date(a.date).getTime();
    const second = new Date(b.date).getTime();

    if (Number.isNaN(first) || Number.isNaN(second)) {
      return 0;
    }

    return first - second;
  });

    return response.status(200).json({
      ok: true,
      messages,
    });
  } catch (error) {
    console.error("PhilSMS history fetch failed:", error);

    return response.status(500).json({
      error: "Could not contact Apps Script for SMS history.",
    });
  }
}