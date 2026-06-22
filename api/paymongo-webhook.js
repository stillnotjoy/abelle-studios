// api/paymongo-webhook.js

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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = request.body;

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

    return response.status(200).json({
      received: true,
      paid: true,
      checkoutSessionId,
      calendar: calendarJson,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return response.status(500).json({
      error: "Webhook handler failed.",
      details: error.message,
    });
  }
}