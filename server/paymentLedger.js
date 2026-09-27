/* global process */

import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function cleanText(value) {
  return String(value || "").trim();
}

function toMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export async function recordPaymentTransaction({
  booking,
  amount,
  paymentDate,
  paymentMethod = "UNKNOWN",
  paymentProvider = "",
  paymentReference = "",
  source = "MANUAL_PAYMENT",
  notes = "",
  idempotencyKey = "",
}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase payment ledger configuration is missing."
    );
  }

  const paymentAmount = toMoney(amount);

  if (!booking?.id || !booking?.booking_reference) {
    throw new Error(
      "A saved booking is required to record a payment."
    );
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error(
      "The payment ledger amount must be greater than zero."
    );
  }

  const parsedPaymentDate = new Date(
    paymentDate || Date.now()
  );

  if (Number.isNaN(parsedPaymentDate.getTime())) {
    throw new Error(
      "The payment ledger date is invalid."
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/crm_payment_transactions?on_conflict=idempotency_key`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer:
          "resolution=ignore-duplicates,return=representation",
      },
      body: JSON.stringify({
        booking_id: booking.id,
        booking_reference:
          booking.booking_reference,
        client_name: booking.client_name || null,
        package_title:
          booking.package_title || null,
        payment_date:
          parsedPaymentDate.toISOString(),
        amount: paymentAmount,
        transaction_type: "PAYMENT",
        payment_method:
          cleanText(paymentMethod).toUpperCase() ||
          "UNKNOWN",
        payment_provider:
          cleanText(paymentProvider) || null,
        payment_reference:
          cleanText(paymentReference) || null,
        source,
        notes: cleanText(notes) || null,
        idempotency_key:
          cleanText(idempotencyKey) ||
          `${source.toLowerCase()}:${booking.id}:${randomUUID()}`,
      }),
    }
  );

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("Payment ledger insert failed:", data);

    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : "The payment was saved, but its revenue entry could not be recorded."
    );
  }

  return Array.isArray(data) ? data[0] || null : data;
}
