import { createClient } from "@supabase/supabase-js";

const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const GOOGLE_APPS_SCRIPT_SECRET = process.env.GOOGLE_APPS_SCRIPT_SECRET;

const APPS_SCRIPT_REQUEST_HEADERS = {
  Accept: "application/json,text/plain,*/*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
};

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.BASE_URL ||
    process.env.URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Missing Supabase env vars. Found URL: ${Boolean(
        supabaseUrl
      )}, Found service key: ${Boolean(serviceRoleKey)}`
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

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
    )
      .toLowerCase()
      .includes("in")
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

function getExpectedSecret() {
  return (
    process.env.ABELLE_LOG_SECRET ||
    process.env.PAYMONGO_WEBHOOK_SECRET ||
    process.env.GOOGLE_APPS_SCRIPT_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.SECRET_KEY
  );
}

function normalizeSupabaseConversation(row, index) {
  const type = row.type || "email";

  return {
    id: row.id || `${type}-${index}`,
    text: row.message || "",
    subject: row.subject || "",
    date: row.created_at || "",
    direction: row.direction || "outbound",
    status: row.status || "sent",
    type,
    provider: row.provider || "supabase",
    bookingReference: row.booking_reference || "",
  };
}

function normalizeActivity(row, index) {
  return {
    id: row.id || `activity-${index}`,
    date: row.created_at || "",
    type: row.activity_type || "system_event",
    title: row.title || "Customer activity",
    description: row.description || "",
    oldValue: row.old_value || "",
    newValue: row.new_value || "",
    createdBy: row.created_by || "system",
    bookingReference: row.booking_reference || "",
  };
}

function sortByDateAscending(items) {
  return [...items].sort((a, b) => {
    const first = new Date(a.date).getTime();
    const second = new Date(b.date).getTime();

    if (Number.isNaN(first) || Number.isNaN(second)) {
      return 0;
    }

    return first - second;
  });
}

function sortByDateDescending(items) {
  return [...items].sort((a, b) => {
    const first = new Date(a.date).getTime();
    const second = new Date(b.date).getTime();

    if (Number.isNaN(first) || Number.isNaN(second)) {
      return 0;
    }

    return second - first;
  });
}


async function handleConversationFetch(request, response) {
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_SECRET) {
    return response.status(500).json({
      error: "Apps Script connection is not configured.",
    });
  }

  const phone = String(request.query.phone || "").trim();
  const email = String(request.query.email || "").trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone && !email) {
    return response.status(400).json({
      error: "A customer mobile number or email address is required.",
    });
  }

  let smsMessages = [];
  let supabaseMessages = [];
  let activities = [];

  try {
    const appsScriptUrl = new URL(GOOGLE_APPS_SCRIPT_URL);
    appsScriptUrl.searchParams.set("action", "philsms_history");
    appsScriptUrl.searchParams.set("secret", GOOGLE_APPS_SCRIPT_SECRET);
    appsScriptUrl.searchParams.set("phone", phone);

    console.log("Apps Script URL being called:", appsScriptUrl.toString());

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
      console.warn("Could not load PhilSMS conversation history:", payload);
    } else {
      const rawMessages = getMessagesFromPayload(payload);

      smsMessages = rawMessages.map((message, index) => ({
        ...normalizeMessage(message, index),
        type: "sms",
        provider: "philsms",
      }));
    }
  } catch (error) {
    console.warn("PhilSMS history fetch failed:", error);
  }

  try {
    const supabase = getSupabaseClient();

    let conversationQuery = supabase
      .from("customer_conversations")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);

    if (normalizedPhone && email) {
      conversationQuery = conversationQuery.or(
        `normalized_phone.eq.${normalizedPhone},customer_email.eq.${email}`
      );
    } else if (normalizedPhone) {
      conversationQuery = conversationQuery.eq("normalized_phone", normalizedPhone);
    } else {
      conversationQuery = conversationQuery.eq("customer_email", email);
    }

    const { data: conversationRows, error: conversationError } =
      await conversationQuery;

    if (conversationError) {
      throw conversationError;
    }

    supabaseMessages = (conversationRows || []).map(normalizeSupabaseConversation);

    let activityQuery = supabase
      .from("customer_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (normalizedPhone && email) {
      activityQuery = activityQuery.or(
        `normalized_phone.eq.${normalizedPhone},customer_email.eq.${email}`
      );
    } else if (normalizedPhone) {
      activityQuery = activityQuery.eq("normalized_phone", normalizedPhone);
    } else {
      activityQuery = activityQuery.eq("customer_email", email);
    }

    const { data: activityRows, error: activityError } = await activityQuery;

    if (activityError) {
      throw activityError;
    }

    activities = (activityRows || []).map(normalizeActivity);
  } catch (error) {
    console.error("Supabase customer conversation fetch failed:", error);

    return response.status(500).json({
      error: "Could not load saved customer conversation logs.",
      details: error.message,
    });
  }

  const messages = sortByDateAscending([
    ...smsMessages,
    ...supabaseMessages,
  ]);

  return response.status(200).json({
    ok: true,
    messages,
    activities: sortByDateDescending(activities),
  });
}

async function handleCustomerEventLog(request, response) {
  let supabase;

  try {
    supabase = getSupabaseClient();
  } catch (error) {
    console.error(error.message);

    return response.status(500).json({
      error: error.message,
    });
  }

  const secret = request.headers["x-abelle-log-secret"];
  const expectedSecret = getExpectedSecret();

  if (!expectedSecret) {
    return response.status(500).json({
      error: "Missing log secret.",
    });
  }

  if (secret !== expectedSecret) {
    return response.status(401).json({
      error: "Unauthorized.",
    });
  }

  let payload = request.body || {};

  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (error) {
      return response.status(400).json({
        error: "Invalid JSON body.",
        details: error.message,
      });
    }
  }

  const normalizedPhone = normalizePhone(payload.customerPhone);

  if (payload.kind === "conversation") {
    const { error } = await supabase
      .from("customer_conversations")
      .insert({
        customer_name: payload.customerName || null,
        customer_phone: payload.customerPhone || null,
        normalized_phone: normalizedPhone || null,
        customer_email: payload.customerEmail || null,

        type: payload.type || "email",
        direction: payload.direction || "outbound",
        status: payload.status || "sent",

        subject: payload.subject || null,
        message: payload.message || null,

        provider: payload.provider || "apps_script",
        provider_uid: payload.providerUid || null,

        booking_reference: payload.bookingReference || null,
        raw_response: payload.rawResponse || payload,
      });

    if (error) {
      console.error("Conversation log failed:", error);

      return response.status(500).json({
        error: "Conversation log failed.",
        details: error.message,
      });
    }

    return response.status(200).json({
      ok: true,
    });
  }

  if (payload.kind === "activity") {
    const { error } = await supabase
      .from("customer_activity_logs")
      .insert({
        customer_name: payload.customerName || null,
        customer_phone: payload.customerPhone || null,
        normalized_phone: normalizedPhone || null,
        customer_email: payload.customerEmail || null,

        booking_reference: payload.bookingReference || null,

        activity_type: payload.activityType || "system_event",
        title: payload.title || "Customer activity",
        description: payload.description || null,

        old_value: payload.oldValue || null,
        new_value: payload.newValue || null,

        created_by: payload.createdBy || "system",
        raw_data: payload.rawData || payload,
      });

    if (error) {
      console.error("Activity log failed:", error);

      return response.status(500).json({
        error: "Activity log failed.",
        details: error.message,
      });
    }

    return response.status(200).json({
      ok: true,
    });
  }

  return response.status(400).json({
    error: "Invalid log kind.",
  });
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    return handleConversationFetch(request, response);
  }

  if (request.method === "POST") {
    return handleCustomerEventLog(request, response);
  }

  response.setHeader("Allow", "GET, POST");

  return response.status(405).json({
    error: "Method not allowed.",
  });
}