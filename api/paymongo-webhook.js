// api/paymongo-webhook.js

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

function parsePayMongoSignature(header) {
  return String(header || "")
    .split(",")
    .reduce((parts, entry) => {
      const separatorIndex =
        entry.indexOf("=");

      if (separatorIndex < 0) {
        return parts;
      }

      const key = entry
        .slice(0, separatorIndex)
        .trim();

      const value = entry
        .slice(separatorIndex + 1)
        .trim();

      if (key) {
        parts[key] = value;
      }

      return parts;
    }, {});
}

function signaturesMatch(expected, received) {
  if (!expected || !received) {
    return false;
  }

  const expectedBuffer =
    Buffer.from(expected, "utf8");

  const receivedBuffer =
    Buffer.from(received, "utf8");

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

function verifyPayMongoSignature(
  rawBody,
  signatureHeader,
  webhookSecret
) {
  const signatureParts =
    parsePayMongoSignature(
      signatureHeader
    );

  const timestamp =
    signatureParts.t;

  if (!timestamp) {
    return false;
  }

  const expectedSignature = createHmac(
    "sha256",
    webhookSecret
  )
    .update(
      `${timestamp}.${rawBody.toString("utf8")}`
    )
    .digest("hex");

  return [
    signatureParts.te,
    signatureParts.li,
  ]
    .filter(Boolean)
    .some((signature) =>
      signaturesMatch(
        expectedSignature,
        signature
      )
    );
}

async function updateCheckoutAttemptAsPaid({ checkoutSessionId, paymongoReference }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase environment variables.");
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/checkout_attempts?checkout_session_id=eq.${encodeURIComponent(
      checkoutSessionId
    )}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "PAID",
        updated_at: new Date().toISOString(),
        notes: `Paid via PayMongo. Reference: ${
          paymongoReference || checkoutSessionId
        }`,
      }),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    console.error("Supabase PAID update failed:", text);
    return null;
  }

  try {
    const rows = text ? JSON.parse(text) : [];
    return rows?.[0] || null;
  } catch (error) {
    console.error("Could not parse Supabase update response:", text);
    return null;
  }
}

async function savePaidBookingToCrm({
  bookingReference,
  checkoutSessionId,
  paymongoReference,
  metadata,
  paidAttempt,
  calendarData,
}) {
  const supabaseUrl =
    process.env.SUPABASE_URL;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Missing Supabase environment variables."
    );
  }

  const clientName =
    metadata.name ||
    paidAttempt?.client_name ||
    "";

  const packageTitle =
    metadata.packageTitle ||
    paidAttempt?.package_title ||
    "";

  const shootDate =
    metadata.shootDate ||
    metadata.date ||
    paidAttempt?.shoot_date ||
    "";

  const shootTime =
    metadata.shootTime ||
    metadata.time ||
    paidAttempt?.shoot_time ||
    "";

  if (
    !bookingReference ||
    !clientName ||
    !packageTitle ||
    !shootDate ||
    !shootTime
  ) {
    throw new Error(
      "The paid booking is missing required CRM details."
    );
  }

  const packagePrice = Number(
    metadata.packagePrice ||
      paidAttempt?.package_price ||
      0
  );

  const amountPaid = Number(
    metadata.amountToPay ||
      metadata.totalToPayNow ||
      paidAttempt?.amount_to_pay ||
      0
  );

  const calendarEventId =
    calendarData?.eventId ||
    calendarData?.calendarEventId ||
    "";

  const notes = [
    metadata.notes ||
      paidAttempt?.notes ||
      "",
    metadata.discountCode
      ? `Discount code ${metadata.discountCode} applied. Discount amount: PHP ${metadata.discountAmount || 0}.`
      : "",
    `Paid online via PayMongo. Reference: ${paymongoReference}.`,
  ]
    .filter(Boolean)
    .join(" | ");

  const crmResponse = await fetch(
    `${supabaseUrl}/rest/v1/manual_bookings?on_conflict=booking_reference`,
    {
      method: "POST",
      headers: {
        apikey:
          supabaseServiceRoleKey,
        Authorization:
          `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type":
          "application/json",
        Prefer:
          "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        booking_reference:
          bookingReference,
        client_name: clientName,
        email:
          metadata.email ||
          paidAttempt?.email ||
          "",
        phone:
          metadata.phone ||
          paidAttempt?.phone ||
          "",
        package_title: packageTitle,
        package_price: packagePrice,
        shoot_date: shootDate,
        shoot_time: shootTime,
        notes,
        payment_status: "PAID",
        amount_paid: amountPaid,
        remaining_balance: 0,
        booking_status: "CONFIRMED",
        calendar_event_id:
          calendarEventId || null,
        calendar_status:
          calendarEventId
            ? "CREATED"
            : "PENDING",
        booking_source: "WEBSITE",
        checkout_session_id:
          checkoutSessionId,
        payment_provider:
          "PAYMONGO",
        payment_reference:
          paymongoReference,
        payment_option:
          metadata.paymentOption ||
          paidAttempt?.payment_option ||
          "full_online",
        shoot_status: "SCHEDULED",
        post_production_status:
          "NOT_STARTED",
      }),
    }
  );

  const responseText =
    await crmResponse.text();

  let crmData = null;

  try {
    crmData = responseText
      ? JSON.parse(responseText)
      : null;
  } catch {
    crmData = responseText;
  }

  if (!crmResponse.ok) {
    console.error(
      "Paid CRM booking save failed:",
      crmData
    );

    throw new Error(
      typeof crmData === "object" &&
        crmData?.message
        ? crmData.message
        : "Could not add the paid booking to the CRM."
    );
  }

  return Array.isArray(crmData)
    ? crmData[0] || null
    : crmData;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const webhookSecret =
      process.env.PAYMONGO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "Missing PAYMONGO_WEBHOOK_SECRET environment variable."
      );

      return response.status(500).json({
        error:
          "Webhook verification is not configured.",
      });
    }

    const rawBody =
      await readRawBody(request);

    const signatureHeader =
      request.headers[
        "paymongo-signature"
      ];

    if (
      !verifyPayMongoSignature(
        rawBody,
        signatureHeader,
        webhookSecret
      )
    ) {
      console.error(
        "Rejected PayMongo webhook with an invalid signature."
      );

      return response.status(401).json({
        error:
          "Invalid webhook signature.",
      });
    }

    let event;

    try {
      event = JSON.parse(
        rawBody.toString("utf8")
      );
    } catch {
      return response.status(400).json({
        error:
          "Invalid webhook payload.",
      });
    }

    const eventType = event?.data?.attributes?.type;
    const checkoutSession = event?.data?.attributes?.data;
    const checkoutAttributes = checkoutSession?.attributes || {};
    const metadata = checkoutAttributes?.metadata || {};

    const checkoutSessionId = checkoutSession?.id || "";
    const paymongoReference =
      checkoutSessionId ||
      checkoutAttributes?.reference_number ||
      checkoutAttributes?.payment_intent?.id ||
      "";

    console.log("PAYMONGO WEBHOOK RECEIVED");
    console.log("Event type:", eventType);
    console.log("Checkout Session ID:", checkoutSessionId);
    console.log("Metadata:", metadata);

    if (eventType !== "checkout_session.payment.paid") {
      return response.status(200).json({
        received: true,
        ignored: true,
        eventType,
      });
    }

    if (!checkoutSessionId) {
      return response.status(400).json({
        error: "Missing checkout session ID.",
      });
    }

    const paidAttempt =
      await updateCheckoutAttemptAsPaid({
        checkoutSessionId,
        paymongoReference,
      });

    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

    if (!appsScriptUrl || !appsScriptSecret) {
      console.error("Missing Apps Script environment variables.");
      return response.status(500).json({
        error: "Missing Apps Script environment variables.",
      });
    }

    const packagePrice = Number(metadata.packagePrice || 0);
    const amountPaid = Number(metadata.amountToPay || metadata.totalToPayNow || 0);
    const remainingBalance = Number(metadata.remainingBalance || 0);

    const bookingPayload = {
      secret: appsScriptSecret,

      name: metadata.name || "",
      email: metadata.email || "",
      phone: metadata.phone || "",

      packageTitle: metadata.packageTitle || "",
      packagePrice,

      amountDueToday: amountPaid,
      onlineFee: 0,
      totalToPayNow: amountPaid,
      remainingBalance,

      date: metadata.shootDate || metadata.date || "",
      time: metadata.shootTime || metadata.time || "",

      notes: [
        metadata.notes || "",
        metadata.discountCode
          ? `Discount code used: ${metadata.discountCode}. Discount amount: ₱${metadata.discountAmount || 0}.`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),

      paymongoReference,
      checkoutSessionId,
    };

    console.log("SENDING PAID BOOKING TO APPS SCRIPT:", bookingPayload);

    if (!bookingPayload.date || !bookingPayload.time) {
      console.error("Missing booking date/time from PayMongo metadata:", metadata);
      return response.status(400).json({
        error: "Missing booking date/time from PayMongo metadata.",
        metadata,
      });
    }

    const calendarResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingPayload),
    });

    const calendarText = await calendarResponse.text();

    console.log("APPS SCRIPT RESPONSE:", calendarText);

    if (!calendarResponse.ok) {
      return response.status(500).json({
        error: "Apps Script booking failed.",
        details: calendarText,
      });
    }

    let calendarJson = {};
    try {
      calendarJson = calendarText ? JSON.parse(calendarText) : {};
    } catch (error) {
      calendarJson = { raw: calendarText };
    }

    if (calendarJson.ok === false) {
      return response.status(500).json({
        error: "Apps Script returned an error.",
        details: calendarJson,
      });
    }

    const bookingReference =
      metadata.bookingReference ||
      paidAttempt?.booking_reference ||
      checkoutAttributes.reference_number ||
      "";

    const crmBooking =
      await savePaidBookingToCrm({
        bookingReference,
        checkoutSessionId,
        paymongoReference,
        metadata,
        paidAttempt,
        calendarData: calendarJson,
      });

    return response.status(200).json({
      received: true,
      paid: true,
      checkoutSessionId,
      calendar: calendarJson,
      crmBookingId:
        crmBooking?.id || null,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return response.status(500).json({
      error: "Webhook handler failed.",
      details: error.message,
    });
  }
}
