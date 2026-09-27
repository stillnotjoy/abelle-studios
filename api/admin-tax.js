/* global process */

import { requireAdmin } from "../server/adminAuth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_APPS_SCRIPT_SECRET =
  process.env.GOOGLE_APPS_SCRIPT_SECRET;
const TAX_REMINDER_EMAIL =
  process.env.TAX_REMINDER_EMAIL ||
  "hello@abellestudios.xyz";

const FINAL_FILING_STATUSES = new Set([
  "FILED",
  "COMPLETED",
]);

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

function cleanText(value) {
  return String(value || "").trim();
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function dateKey(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function daysBetween(start, end) {
  return Math.round(
    (new Date(`${end}T12:00:00Z`) -
      new Date(`${start}T12:00:00Z`)) /
      86400000
  );
}

function effectiveDueDate(obligation) {
  return (
    obligation.adjusted_due_date ||
    obligation.original_due_date
  );
}

function computedFilingStatus(obligation, today) {
  if (
    obligation.filing_status === "PREPARED" ||
    FINAL_FILING_STATUSES.has(
      obligation.filing_status
    )
  ) {
    return obligation.filing_status;
  }

  const dueDate = effectiveDueDate(obligation);
  const remaining = daysBetween(today, dueDate);

  if (remaining < 0) return "OVERDUE";
  if (remaining === 0) return "DUE_TODAY";
  if (remaining <= 14) return "DUE_SOON";
  return "UPCOMING";
}

function reminderFor(obligation, today) {
  const filingStatus = computedFilingStatus(
    obligation,
    today
  );
  const dueDate = effectiveDueDate(obligation);
  const remaining = daysBetween(today, dueDate);

  if (obligation.filing_status === "COMPLETED") {
    return null;
  }

  if (
    FINAL_FILING_STATUSES.has(
      obligation.filing_status
    ) &&
    ![
      "PAID",
      "NO_PAYMENT_REQUIRED",
    ].includes(obligation.payment_status)
  ) {
    return {
      type: "PAYMENT",
      level: remaining < 0 ? "OVERDUE" : "PENDING",
      message:
        remaining < 0
          ? `Payment remains outstanding ${Math.abs(
              remaining
            )} days after the filing deadline.`
          : "Return filed; payment is still outstanding.",
    };
  }

  if (FINAL_FILING_STATUSES.has(filingStatus)) {
    return null;
  }

  if (remaining < 0) {
    return {
      type: "FILING",
      level: "OVERDUE",
      message: `${Math.abs(remaining)} days overdue`,
    };
  }

  if ([14, 7, 3, 1, 0].includes(remaining)) {
    return {
      type: "FILING",
      level: remaining === 0 ? "DUE_TODAY" : "DUE_SOON",
      message:
        remaining === 0
          ? "Due today"
          : `Due in ${remaining} day${
              remaining === 1 ? "" : "s"
            }`,
    };
  }

  return null;
}

async function supabaseRequest(
  path,
  { method = "GET", params, body, prefer } = {}
) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Tax compliance database is not configured."
    );
  }

  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}${query}`,
    {
      method,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer:
          prefer ||
          (method === "GET"
            ? ""
            : "return=representation"),
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
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
    console.error("Tax data request failed:", data);
    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : "Tax data request failed."
    );
  }

  return data;
}

async function getObligation(id) {
  const rows = await supabaseRequest(
    "bir_tax_obligations",
    {
      params: {
        select: "*",
        id: `eq.${id}`,
        limit: "1",
      },
    }
  );

  return rows?.[0] || null;
}

async function addAudit({
  entityType,
  entityId,
  action,
  userId,
  oldValues,
  newValues,
  notes,
}) {
  await supabaseRequest("bir_tax_audit_log", {
    method: "POST",
    body: {
      entity_type: entityType,
      entity_id: entityId,
      action,
      changed_by: userId || null,
      old_values: oldValues || null,
      new_values: newValues || null,
      change_notes: notes || null,
    },
  });
}

function transactionAmount(transaction) {
  const amount = money(transaction.amount);
  return transaction.transaction_type === "REFUND"
    ? -amount
    : amount;
}

function salesForPeriod(transactions, start, end) {
  return money(
    transactions.reduce((total, transaction) => {
      const paymentDate = dateKey(
        transaction.payment_date
      );

      return paymentDate >= start && paymentDate <= end
        ? total + transactionAmount(transaction)
        : total;
    }, 0)
  );
}

function expenseSummary(expenses, start, end) {
  const rows = expenses.filter(
    (expense) =>
      expense.expense_date >= start &&
      expense.expense_date <= end
  );

  return {
    expenses: money(
      rows.reduce(
        (total, row) =>
          total + money(row.gross_amount),
        0
      )
    ),
    rent: money(
      rows
        .filter((row) => row.category === "RENT")
        .reduce(
          (total, row) =>
            total + money(row.gross_amount),
          0
        )
    ),
    ewtWithheld: money(
      rows
        .filter((row) =>
          [
            "CONFIRMED",
            "WITHHELD",
            "REMITTED",
          ].includes(row.withholding_status)
        )
        .reduce(
          (total, row) =>
            total + money(row.ewt_amount),
          0
        )
    ),
    ewtRemitted: money(
      rows
        .filter(
          (row) =>
            row.withholding_status === "REMITTED"
        )
        .reduce(
          (total, row) =>
            total + money(row.ewt_amount),
          0
        )
    ),
  };
}

function currentQuarterRange(today) {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const quarter = Math.ceil(month / 3);
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const endDate = new Date(
    Date.UTC(year, endMonth, 0)
  );

  return {
    key: `${year}-Q${quarter}`,
    start: `${year}-${String(startMonth).padStart(
      2,
      "0"
    )}-01`,
    end: endDate.toISOString().slice(0, 10),
    year,
  };
}

async function loadDashboard() {
  const [
    profiles,
    obligations,
    adjustments,
    expenses,
    taxPayments,
    transactions,
    audit,
  ] = await Promise.all([
    supabaseRequest("bir_business_profile", {
      params: { select: "*", limit: "1" },
    }),
    supabaseRequest("bir_tax_obligations", {
      params: {
        select: "*",
        order: "original_due_date.asc",
      },
    }),
    supabaseRequest("bir_deadline_adjustments", {
      params: {
        select: "*",
        order: "circular_date.desc",
      },
    }),
    supabaseRequest("bir_tax_expenses", {
      params: {
        select: "*",
        order: "expense_date.desc",
      },
    }),
    supabaseRequest("bir_tax_payments", {
      params: {
        select: "*",
        order: "payment_date.desc",
      },
    }),
    supabaseRequest("crm_payment_transactions", {
      params: {
        select:
          "payment_date,amount,transaction_type",
        order: "payment_date.desc",
        limit: "5000",
      },
    }),
    supabaseRequest("bir_tax_audit_log", {
      params: {
        select:
          "id,entity_type,entity_id,action,change_notes,created_at",
        order: "created_at.desc",
        limit: "30",
      },
    }),
  ]);

  const today = dateKey(new Date());
  const quarter = currentQuarterRange(today);
  const yearStart = `${quarter.year}-01-01`;
  const yearEnd = `${quarter.year}-12-31`;

  const enrichedObligations = obligations.map(
    (obligation) => {
      const systemGrossSales = salesForPeriod(
        transactions,
        obligation.period_start,
        obligation.period_end
      );
      const filingStatus = computedFilingStatus(
        obligation,
        today
      );
      const dueDate = effectiveDueDate(obligation);

      return {
        ...obligation,
        system_gross_sales: systemGrossSales,
        filing_status: filingStatus,
        effective_due_date: dueDate,
        days_remaining: daysBetween(today, dueDate),
        estimated_outstanding: money(
          Math.max(
            money(obligation.amount_due) -
              money(obligation.amount_paid),
            0
          ) + money(obligation.estimated_penalties)
        ),
        reminder: reminderFor(obligation, today),
      };
    }
  );

  const active = enrichedObligations.filter(
    (obligation) =>
      obligation.filing_status !== "COMPLETED"
  );
  const overdue = active.filter(
    (obligation) =>
      obligation.filing_status === "OVERDUE"
  );
  const nextFiling = active
    .filter(
      (obligation) => obligation.days_remaining >= 0
    )
    .sort(
      (first, second) =>
        first.days_remaining - second.days_remaining
    )[0] || null;

  const currentQuarterExpenses = expenseSummary(
    expenses,
    quarter.start,
    quarter.end
  );
  const yearExpenses = expenseSummary(
    expenses,
    yearStart,
    yearEnd
  );
  const quarterSales = salesForPeriod(
    transactions,
    quarter.start,
    quarter.end
  );
  const yearSales = salesForPeriod(
    transactions,
    yearStart,
    yearEnd
  );
  const quarterPercentageTax = money(
    quarterSales * 0.03
  );
  const quarterOsd = money(quarterSales * 0.4);
  const quarterTaxableIncome = money(
    quarterSales - quarterOsd
  );

  const taxesPaid = money(
    taxPayments.reduce(
      (total, payment) =>
        total + money(payment.amount),
      0
    )
  );
  const estimatedOutstanding = money(
    enrichedObligations.reduce(
      (total, obligation) =>
        total + obligation.estimated_outstanding,
      0
    )
  );

  return {
    asOf: today,
    profile: profiles?.[0] || null,
    nextFiling,
    overdue,
    obligations: enrichedObligations,
    adjustments,
    expenses,
    taxPayments,
    audit,
    reminders: enrichedObligations
      .filter((obligation) => obligation.reminder)
      .map((obligation) => ({
        obligationId: obligation.id,
        formCode: obligation.form_code,
        periodLabel: obligation.period_label,
        dueDate: obligation.effective_due_date,
        ...obligation.reminder,
      })),
    notificationSettings: {
      emailConfigured: true,
      recipient: TAX_REMINDER_EMAIL,
      deliveryTime: "Around 7:00 AM Asia/Manila",
      status: "AWAITING_TRIGGER_ACTIVATION",
    },
    summary: {
      overdueCount: overdue.length,
      overdueBasicTax: money(
        overdue.reduce(
          (total, obligation) =>
            total + obligation.estimated_outstanding,
          0
        )
      ),
      taxesPaid,
      estimatedOutstanding,
      currentQuarter: {
        periodKey: quarter.key,
        grossSales: quarterSales,
        taxDeclaredGrossSales:
          enrichedObligations.find(
            (item) =>
              item.form_code === "2551Q" &&
              item.period_key === quarter.key
          )?.tax_declared_gross_sales ?? null,
        ...currentQuarterExpenses,
        estimatedPercentageTax:
          quarterPercentageTax,
        osd: quarterOsd,
        estimatedTaxableIncome:
          quarterTaxableIncome,
        estimatedIncomeTax: 0,
        ewtRemaining: money(
          Math.max(
            currentQuarterExpenses.ewtWithheld -
              currentQuarterExpenses.ewtRemitted,
            0
          )
        ),
      },
      currentYear: {
        year: quarter.year,
        grossSales: yearSales,
        taxDeclaredGrossSales: money(
          enrichedObligations
            .filter(
              (item) =>
                item.form_code === "2551Q" &&
                item.period_start.startsWith(
                  String(quarter.year)
                )
            )
            .reduce(
              (total, item) =>
                total +
                money(
                  item.tax_declared_gross_sales || 0
                ),
              0
            )
        ),
        ...yearExpenses,
        osd: money(yearSales * 0.4),
        taxesPaid,
        estimatedOutstanding,
        upcomingFilings: active.filter(
          (item) => item.days_remaining >= 0
        ).length,
      },
    },
  };
}

async function loadTaxReminderFeed() {
  const dashboard = await loadDashboard();
  const today = dashboard.asOf;
  const sentToday = await supabaseRequest(
    "bir_tax_reminder_deliveries",
    {
      params: {
        select: "reminder_key",
        channel: "eq.EMAIL",
        scheduled_for: `eq.${today}`,
        status: "eq.SENT",
      },
    }
  );
  const sentKeys = new Set(
    (sentToday || []).map((item) => item.reminder_key)
  );
  const reminders = dashboard.reminders
    .map((reminder) => ({
      ...reminder,
      reminderKey: [
        "tax-email",
        today,
        reminder.obligationId,
        reminder.type,
        reminder.level,
      ].join(":"),
    }))
    .filter(
      (reminder) => !sentKeys.has(reminder.reminderKey)
    );

  return {
    ok: true,
    asOf: today,
    recipient: TAX_REMINDER_EMAIL,
    dashboardUrl: "https://www.abellestudios.xyz/admin",
    reminders,
  };
}

async function acknowledgeTaxReminders(body) {
  const reminderKeys = Array.isArray(body.reminderKeys)
    ? body.reminderKeys.map(cleanText).filter(Boolean)
    : [];

  if (!reminderKeys.length) {
    throw new Error("No tax reminder keys were supplied.");
  }

  const dashboard = await loadDashboard();
  const remindersByKey = new Map(
    dashboard.reminders.map((reminder) => [
      [
        "tax-email",
        dashboard.asOf,
        reminder.obligationId,
        reminder.type,
        reminder.level,
      ].join(":"),
      reminder,
    ])
  );
  const deliveries = reminderKeys
    .map((reminderKey) => {
      const reminder = remindersByKey.get(reminderKey);
      if (!reminder) return null;

      return {
        obligation_id: reminder.obligationId,
        channel: "EMAIL",
        reminder_key: reminderKey,
        recipient: TAX_REMINDER_EMAIL,
        reminder_type: reminder.type,
        reminder_level: reminder.level,
        scheduled_for: dashboard.asOf,
        sent_at: new Date().toISOString(),
        provider_reference:
          cleanText(body.providerReference) || null,
        status: "SENT",
      };
    })
    .filter(Boolean);

  if (!deliveries.length) {
    throw new Error("The tax reminders are no longer active.");
  }

  await supabaseRequest(
    "bir_tax_reminder_deliveries",
    {
      method: "POST",
      params: { on_conflict: "reminder_key" },
      prefer:
        "resolution=ignore-duplicates,return=representation",
      body: deliveries,
    }
  );

  return { ok: true, recorded: deliveries.length };
}

async function updateObligation(
  body,
  user
) {
  const id = cleanText(body.id);
  const action = cleanText(body.action);
  const existing = await getObligation(id);

  if (!existing) {
    throw new Error("Tax obligation was not found.");
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };
  let auditAction = action.toUpperCase();

  if (action === "prepare") {
    if (existing.historical_locked) {
      throw new Error(
        "This historical record is locked. Add a reconciliation note instead of recalculating it."
      );
    }

    updates.filing_status = "PREPARED";
    updates.prepared_at =
      cleanText(body.preparedAt) ||
      new Date().toISOString();
    updates.tax_declared_gross_sales = money(
      body.taxDeclaredGrossSales
    );
    updates.amount_calculated = money(
      body.amountCalculated
    );
    updates.amount_due = money(body.amountDue);
    updates.calculation_method = cleanText(
      body.calculationMethod
    );
    updates.notes = cleanText(body.notes);
    updates.payment_status =
      updates.amount_due === 0
        ? "NO_PAYMENT_REQUIRED"
        : "PAYMENT_PENDING";
  } else if (action === "mark_filed") {
    if (existing.filing_status !== "PREPARED") {
      throw new Error(
        "Prepare and review this return before marking it as filed."
      );
    }

    const filedAt = cleanText(body.filedAt);
    const reference = cleanText(
      body.filingConfirmationReference
    );

    if (!filedAt || !reference) {
      throw new Error(
        "Enter the filing date and BIR confirmation/reference."
      );
    }

    updates.filed_at = filedAt;
    updates.filing_confirmation_reference =
      reference;
    updates.final_declared_amount = money(
      body.finalDeclaredAmount
    );
    updates.notes = cleanText(body.notes);
    updates.historical_locked = true;
    updates.filing_status = [
      "PAID",
      "NO_PAYMENT_REQUIRED",
    ].includes(existing.payment_status)
      ? "COMPLETED"
      : "FILED";
  } else if (action === "mark_paid") {
    if (existing.filing_status !== "FILED") {
      throw new Error(
        "Confirm the BIR filing before recording its tax payment."
      );
    }

    const amount = money(body.amount);
    const paidAt = cleanText(body.paidAt);
    const paymentMethod = cleanText(
      body.paymentMethod
    );

    if (amount <= 0 || !paidAt || !paymentMethod) {
      throw new Error(
        "Enter a valid payment date, amount, and method."
      );
    }

    await supabaseRequest("bir_tax_payments", {
      method: "POST",
      body: {
        obligation_id: id,
        payment_date: paidAt,
        amount,
        payment_method: paymentMethod,
        payment_reference:
          cleanText(body.paymentReference) || null,
        notes: cleanText(body.notes) || null,
      },
    });

    const newPaidAmount = money(
      money(existing.amount_paid) + amount
    );
    const fullyPaid =
      newPaidAmount >= money(existing.amount_due);

    updates.amount_paid = newPaidAmount;
    updates.paid_at = paidAt;
    updates.payment_method = paymentMethod;
    updates.payment_reference =
      cleanText(body.paymentReference) || null;
    updates.payment_status = fullyPaid
      ? "PAID"
      : "PARTIALLY_PAID";
    updates.filing_status =
      fullyPaid && existing.filed_at
        ? "COMPLETED"
        : existing.filing_status;
  } else if (action === "update_notes") {
    updates.notes = cleanText(body.notes);
  } else {
    throw new Error("Unsupported tax obligation action.");
  }

  const updated = await supabaseRequest(
    "bir_tax_obligations",
    {
      method: "PATCH",
      params: { id: `eq.${id}` },
      body: updates,
    }
  );

  await addAudit({
    entityType: "TAX_OBLIGATION",
    entityId: id,
    action: auditAction,
    userId: user.id,
    oldValues: existing,
    newValues: updated?.[0] || updates,
    notes: cleanText(body.changeNotes || body.notes),
  });

  return updated?.[0] || null;
}

async function updateDeadlineAdjustment(
  body,
  user
) {
  const id = cleanText(body.id);
  const status = cleanText(
    body.applicabilityStatus
  ).toUpperCase();

  if (
    ![
      "PENDING_VERIFICATION",
      "APPLICABLE",
      "NOT_APPLICABLE",
    ].includes(status)
  ) {
    throw new Error("Choose a valid applicability status.");
  }

  const rows = await supabaseRequest(
    "bir_deadline_adjustments",
    {
      params: {
        select: "*",
        id: `eq.${id}`,
        limit: "1",
      },
    }
  );
  const existing = rows?.[0];

  if (!existing) {
    throw new Error("Deadline adjustment was not found.");
  }

  const updates = {
    applicability_status: status,
    verification_status:
      status === "PENDING_VERIFICATION"
        ? "PENDING_VERIFICATION"
        : "VERIFIED",
    verified_at:
      status === "PENDING_VERIFICATION"
        ? null
        : new Date().toISOString(),
    notes: cleanText(body.notes),
    source_reference:
      cleanText(body.sourceReference) ||
      existing.source_reference,
    updated_at: new Date().toISOString(),
  };

  const updated = await supabaseRequest(
    "bir_deadline_adjustments",
    {
      method: "PATCH",
      params: { id: `eq.${id}` },
      body: updates,
    }
  );

  const obligationUpdates =
    status === "APPLICABLE"
      ? {
          adjusted_due_date:
            existing.extended_deadline,
          adjusted_due_reason:
            existing.circular_number,
          updated_at: new Date().toISOString(),
        }
      : {
          adjusted_due_date: null,
          adjusted_due_reason: null,
          updated_at: new Date().toISOString(),
        };

  for (const formCode of existing.applicable_forms) {
    await supabaseRequest("bir_tax_obligations", {
      method: "PATCH",
      params: {
        form_code: `eq.${formCode}`,
        original_due_date:
          `eq.${existing.original_deadline}`,
      },
      body: obligationUpdates,
    });
  }

  await addAudit({
    entityType: "DEADLINE_ADJUSTMENT",
    entityId: id,
    action: `APPLICABILITY_${status}`,
    userId: user.id,
    oldValues: existing,
    newValues: updated?.[0] || updates,
    notes: cleanText(body.notes),
  });

  return updated?.[0] || null;
}

async function upsertExpense(body, user) {
  const id = cleanText(body.id);
  const grossAmount = money(body.grossAmount);
  const rate = Number(body.ewtRate || 0);
  const applicable = body.withholdingApplicable;

  if (
    !cleanText(body.expenseDate) ||
    !cleanText(body.supplierPayee) ||
    !cleanText(body.description) ||
    !cleanText(body.category) ||
    grossAmount <= 0
  ) {
    throw new Error(
      "Complete the expense date, payee, description, category, and amount."
    );
  }

  const payload = {
    expense_date: cleanText(body.expenseDate),
    supplier_payee: cleanText(body.supplierPayee),
    description: cleanText(body.description),
    category: cleanText(body.category).toUpperCase(),
    gross_amount: grossAmount,
    receipt_invoice_reference:
      cleanText(body.receiptInvoiceReference) || null,
    withholding_applicable:
      applicable === true
        ? true
        : applicable === false
          ? false
          : null,
    withholding_status:
      cleanText(body.withholdingStatus).toUpperCase() ||
      "FOR_VERIFICATION",
    ewt_rate: rate,
    ewt_amount:
      applicable === true
        ? money(grossAmount * rate)
        : 0,
    net_amount_paid:
      applicable === true
        ? money(grossAmount - grossAmount * rate)
        : grossAmount,
    tax_period: cleanText(body.taxPeriod),
    notes: cleanText(body.notes) || null,
    updated_at: new Date().toISOString(),
  };

  let existing = null;
  let saved;

  if (id) {
    const rows = await supabaseRequest(
      "bir_tax_expenses",
      {
        params: { select: "*", id: `eq.${id}` },
      }
    );
    existing = rows?.[0] || null;
    saved = await supabaseRequest(
      "bir_tax_expenses",
      {
        method: "PATCH",
        params: { id: `eq.${id}` },
        body: payload,
      }
    );
  } else {
    saved = await supabaseRequest(
      "bir_tax_expenses",
      {
        method: "POST",
        body: payload,
      }
    );
  }

  const savedExpense = saved?.[0];

  await addAudit({
    entityType: "TAX_EXPENSE",
    entityId: savedExpense.id,
    action: id ? "UPDATED" : "CREATED",
    userId: user.id,
    oldValues: existing,
    newValues: savedExpense,
    notes: cleanText(body.notes),
  });

  return savedExpense;
}

export default async function handler(request, response) {
  try {
    const taxEmailAction = cleanText(
      request.query?.action
    );
    const taxEmailSecret = cleanText(
      request.query?.secret || request.body?.secret
    );

    if (
      [
        "tax_reminder_feed",
        "tax_reminder_ack",
      ].includes(taxEmailAction)
    ) {
      if (
        !GOOGLE_APPS_SCRIPT_SECRET ||
        taxEmailSecret !== GOOGLE_APPS_SCRIPT_SECRET
      ) {
        return sendJson(response, 401, {
          error: "Unauthorized tax reminder request.",
        });
      }

      response.setHeader("Cache-Control", "no-store");

      if (
        request.method === "GET" &&
        taxEmailAction === "tax_reminder_feed"
      ) {
        return sendJson(
          response,
          200,
          await loadTaxReminderFeed()
        );
      }

      if (
        request.method === "POST" &&
        taxEmailAction === "tax_reminder_ack"
      ) {
        return sendJson(
          response,
          200,
          await acknowledgeTaxReminders(
            request.body || {}
          )
        );
      }

      return sendJson(response, 405, {
        error: "Method not allowed.",
      });
    }

    const user = await requireAdmin(request, response);
    if (!user) return;

    response.setHeader("Cache-Control", "no-store");

    if (request.method === "GET") {
      return sendJson(
        response,
        200,
        await loadDashboard()
      );
    }

    const body = request.body || {};
    const resource = cleanText(body.resource);

    if (request.method === "PATCH") {
      if (resource === "obligation") {
        await updateObligation(body, user);
      } else if (resource === "deadline_adjustment") {
        await updateDeadlineAdjustment(body, user);
      } else {
        throw new Error("Unsupported tax update.");
      }

      return sendJson(response, 200, {
        ok: true,
        dashboard: await loadDashboard(),
      });
    }

    if (
      request.method === "POST" &&
      resource === "expense"
    ) {
      await upsertExpense(body, user);

      return sendJson(response, 201, {
        ok: true,
        dashboard: await loadDashboard(),
      });
    }

    return sendJson(response, 405, {
      error: "Method not allowed.",
    });
  } catch (error) {
    console.error("Tax compliance API failed:", error);

    return sendJson(response, 500, {
      error:
        error.message ||
        "Tax compliance data could not be updated.",
    });
  }
}
