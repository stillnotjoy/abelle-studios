import { createClient } from "@supabase/supabase-js";

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

function getExpectedSecret() {
  return (
    process.env.ABELLE_LOG_SECRET ||
    process.env.PAYMONGO_WEBHOOK_SECRET ||
    process.env.GOOGLE_APPS_SCRIPT_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.SECRET_KEY
  );
}

export default async function handler(request, response) {
  let supabase;

  try {
    supabase = getSupabaseClient();
  } catch (error) {
    console.error(error.message);

    return response.status(500).json({
      error: error.message,
    });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");

    return response.status(405).json({
      error: "Method not allowed.",
    });
  }

  const secret = request.headers["x-abelle-log-secret"];
  const expectedSecret = getExpectedSecret();

  if (!expectedSecret) {
    return response.status(500).json({
      error: "Missing log secret.",
      envCheck: {
        hasAbelleLogSecret: Boolean(process.env.ABELLE_LOG_SECRET),
        hasPaymongoWebhookSecret: Boolean(process.env.PAYMONGO_WEBHOOK_SECRET),
        hasGoogleAppsScriptSecret: Boolean(process.env.GOOGLE_APPS_SCRIPT_SECRET),
        hasWebhookSecret: Boolean(process.env.WEBHOOK_SECRET),
        hasSecretKey: Boolean(process.env.SECRET_KEY),
      },
    });
  }

  if (secret !== expectedSecret) {
    return response.status(401).json({
      error: "Unauthorized.",
      envCheck: {
        hasAbelleLogSecret: Boolean(process.env.ABELLE_LOG_SECRET),
        hasPaymongoWebhookSecret: Boolean(process.env.PAYMONGO_WEBHOOK_SECRET),
        hasGoogleAppsScriptSecret: Boolean(process.env.GOOGLE_APPS_SCRIPT_SECRET),
        hasWebhookSecret: Boolean(process.env.WEBHOOK_SECRET),
        hasSecretKey: Boolean(process.env.SECRET_KEY),
      },
    });
  }

  const payload = request.body || {};
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