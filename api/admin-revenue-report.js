/* global process */

import { requireAdmin } from "../server/adminAuth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const MANILA_OFFSET = "+08:00";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXCLUDED_BOOKING_STATUSES = new Set([
  "CANCELLED",
  "CANCELED",
  "DECLINED",
  "EXPIRED",
  "VOID",
]);

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  return Math.round(
    (new Date(`${end}T12:00:00Z`) -
      new Date(`${start}T12:00:00Z`)) /
      86400000
  );
}

async function supabaseGet(path, params) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase revenue reporting is not configured."
    );
  }

  const query = new URLSearchParams(params);
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}?${query.toString()}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
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
    console.error("Revenue report data request failed:", data);
    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : "Revenue report data could not be loaded."
    );
  }

  return Array.isArray(data) ? data : [];
}

function getManilaDateKey(value) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function buildTrend(transactions, start, end) {
  const useMonthlyBuckets =
    !start || !end || daysBetween(start, end) > 93;
  const buckets = new Map();

  transactions.forEach((transaction) => {
    const dateKey = getManilaDateKey(
      transaction.payment_date
    );
    const key = useMonthlyBuckets
      ? dateKey.slice(0, 7)
      : dateKey;
    const signedAmount =
      transaction.transaction_type === "REFUND"
        ? -money(transaction.amount)
        : money(transaction.amount);

    buckets.set(
      key,
      money((buckets.get(key) || 0) + signedAmount)
    );
  });

  return [...buckets.entries()]
    .sort(([first], [second]) =>
      first.localeCompare(second)
    )
    .map(([key, amount]) => ({ key, amount }));
}

function buildAmountBreakdown(rows, getLabel, getAmount) {
  const grouped = new Map();

  rows.forEach((row) => {
    const label = String(getLabel(row) || "Unknown").trim();
    const current = grouped.get(label) || {
      label,
      amount: 0,
      count: 0,
    };

    current.amount = money(
      current.amount + getAmount(row)
    );
    current.count += 1;
    grouped.set(label, current);
  });

  return [...grouped.values()].sort(
    (first, second) => second.amount - first.amount
  );
}

export default async function handler(request, response) {
  try {
    if (!(await requireAdmin(request, response))) {
      return;
    }

    if (request.method !== "GET") {
      return sendJson(response, 405, {
        error: "Method not allowed.",
      });
    }

    const start = String(request.query?.start || "").trim();
    const end = String(request.query?.end || "").trim();

    if (
      (start && !DATE_PATTERN.test(start)) ||
      (end && !DATE_PATTERN.test(end)) ||
      Boolean(start) !== Boolean(end) ||
      (start && start > end)
    ) {
      return sendJson(response, 400, {
        error: "Choose a valid revenue report date range.",
      });
    }

    const transactionParams = {
      select:
        "id,booking_reference,client_name,package_title,payment_date,amount,transaction_type,payment_method,payment_provider,payment_reference,source,notes",
      order: "payment_date.desc",
      limit: "5000",
    };

    const bookingParams = {
      select:
        "id,booking_reference,client_name,package_title,package_price,shoot_date,booking_status,payment_status,amount_paid,remaining_balance,booking_source,payment_provider",
      order: "shoot_date.desc",
      limit: "5000",
    };

    if (start && end) {
      transactionParams.and =
        `(payment_date.gte.${start}T00:00:00${MANILA_OFFSET},` +
        `payment_date.lt.${addDays(end, 1)}T00:00:00${MANILA_OFFSET})`;
      bookingParams.and =
        `(shoot_date.gte.${start},shoot_date.lte.${end})`;
    }

    const [transactions, allBookings] = await Promise.all([
      supabaseGet(
        "crm_payment_transactions",
        transactionParams
      ),
      supabaseGet("manual_bookings", bookingParams),
    ]);

    const bookings = allBookings.filter(
      (booking) =>
        !EXCLUDED_BOOKING_STATUSES.has(
          String(booking.booking_status || "").toUpperCase()
        )
    );

    const payments = transactions.filter(
      (transaction) =>
        transaction.transaction_type !== "REFUND"
    );
    const refunds = transactions.filter(
      (transaction) =>
        transaction.transaction_type === "REFUND"
    );

    const grossCollected = money(
      payments.reduce(
        (total, transaction) =>
          total + money(transaction.amount),
        0
      )
    );
    const refundedAmount = money(
      refunds.reduce(
        (total, transaction) =>
          total + money(transaction.amount),
        0
      )
    );
    const bookedSales = money(
      bookings.reduce(
        (total, booking) =>
          total + money(booking.package_price),
        0
      )
    );
    const paidAgainstBookings = money(
      bookings.reduce(
        (total, booking) =>
          total + money(booking.amount_paid),
        0
      )
    );
    const outstandingBalance = money(
      bookings.reduce(
        (total, booking) =>
          total + money(booking.remaining_balance),
        0
      )
    );
    const historicalTransactions = payments.filter(
      (transaction) =>
        transaction.source === "HISTORICAL_OPENING_BALANCE"
    );

    const paymentMethods = buildAmountBreakdown(
      payments,
      (transaction) =>
        transaction.payment_method ||
        transaction.payment_provider ||
        "Unknown",
      (transaction) => money(transaction.amount)
    );

    const bookingSources = buildAmountBreakdown(
      bookings,
      (booking) => booking.booking_source || "Unknown",
      (booking) => money(booking.package_price)
    );

    return sendJson(response, 200, {
      dateRange: {
        start: start || null,
        end: end || null,
      },
      summary: {
        grossCollected,
        refundedAmount,
        netCollected: money(grossCollected - refundedAmount),
        bookedSales,
        paidAgainstBookings,
        outstandingBalance,
        collectionRate:
          bookedSales > 0
            ? money((paidAgainstBookings / bookedSales) * 100)
            : 0,
        bookingCount: bookings.length,
        paymentCount: payments.length,
        averageBookingValue:
          bookings.length > 0
            ? money(bookedSales / bookings.length)
            : 0,
      },
      trend: buildTrend(transactions, start, end),
      paymentMethods,
      bookingSources,
      recentTransactions: transactions.slice(0, 12),
      dataQuality: {
        historicalCount: historicalTransactions.length,
        historicalAmount: money(
          historicalTransactions.reduce(
            (total, transaction) =>
              total + money(transaction.amount),
            0
          )
        ),
      },
    });
  } catch (error) {
    console.error("Revenue report failed:", error);

    return sendJson(response, 500, {
      error:
        error.message || "Revenue report could not be loaded.",
    });
  }
}
