import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { adminFetch } from "./adminApi";
import "./TaxCRM.css";

const EMPTY_EXPENSE = {
  expenseDate: "",
  supplierPayee: "",
  description: "",
  category: "RENT",
  grossAmount: "",
  receiptInvoiceReference: "",
  withholdingApplicable: "",
  withholdingStatus: "FOR_VERIFICATION",
  ewtRate: "5",
  taxPeriod: "",
  notes: "",
};

function money(value, cents = true) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(
    new Date(
      String(value).length === 10
        ? `${value}T12:00:00+08:00`
        : value
    )
  );
}

function dateTimeInput(value) {
  const date = value ? new Date(value) : new Date();
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 16);
}

function label(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

async function readJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function StatusPill({ value, kind = "filing" }) {
  return (
    <span
      className={`crm-tax-status is-${kind} is-${String(
        value || "unknown"
      ).toLowerCase()}`}
    >
      {label(value)}
    </span>
  );
}

function Metric({ label: title, value, detail }) {
  return (
    <div className="crm-tax-metric">
      <span>{title}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="crm-tax-modal-backdrop">
      <section
        className="crm-tax-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <p>Tax / BIR</p>
            <h2>{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ObligationModal({
  mode,
  obligation,
  onClose,
  onSave,
  isSaving,
}) {
  const [form, setForm] = useState(() => ({
    taxDeclaredGrossSales:
      obligation.tax_declared_gross_sales ??
      obligation.system_gross_sales,
    amountCalculated:
      obligation.amount_calculated,
    amountDue: obligation.amount_due,
    calculationMethod:
      obligation.calculation_method || "",
    preparedAt: dateTimeInput(),
    filedAt: dateTimeInput(),
    filingConfirmationReference: "",
    finalDeclaredAmount:
      obligation.final_declared_amount ??
      obligation.amount_due,
    paidAt: dateTimeInput(),
    amount: Math.max(
      Number(obligation.amount_due || 0) -
        Number(obligation.amount_paid || 0),
      0
    ),
    paymentMethod: "",
    paymentReference: "",
    notes: obligation.notes || "",
  }));

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSave({
      resource: "obligation",
      id: obligation.id,
      action: mode,
      ...form,
    });
  };

  const title =
    mode === "prepare"
      ? "Prepare Return"
      : mode === "mark_filed"
        ? "Confirm Filing"
        : "Record Tax Payment";

  return (
    <Modal
      title={title}
      subtitle={`${obligation.form_code} - ${obligation.period_label}`}
      onClose={onClose}
    >
      <form className="crm-tax-modal-form" onSubmit={submit}>
        {mode === "prepare" && (
          <>
            <div className="crm-tax-form-grid">
              <label>
                System Sales
                <input
                  value={money(
                    obligation.system_gross_sales
                  )}
                  disabled
                />
              </label>
              <label>
                Tax-Declared Gross Sales
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="taxDeclaredGrossSales"
                  value={form.taxDeclaredGrossSales}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Calculated Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="amountCalculated"
                  value={form.amountCalculated}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Basic Amount Due
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="amountDue"
                  value={form.amountDue}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Prepared Date
                <input
                  type="datetime-local"
                  name="preparedAt"
                  value={form.preparedAt}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Calculation Method
                <input
                  name="calculationMethod"
                  value={form.calculationMethod}
                  onChange={update}
                  required
                />
              </label>
            </div>
            <p className="crm-tax-form-warning">
              Preparing a return does not file it with BIR.
              Review the declared sales and calculation first.
            </p>
          </>
        )}

        {mode === "mark_filed" && (
          <>
            <div className="crm-tax-form-grid">
              <label>
                Date Filed
                <input
                  type="datetime-local"
                  name="filedAt"
                  value={form.filedAt}
                  onChange={update}
                  required
                />
              </label>
              <label>
                BIR Confirmation / Reference
                <input
                  name="filingConfirmationReference"
                  value={
                    form.filingConfirmationReference
                  }
                  onChange={update}
                  required
                />
              </label>
              <label>
                Final Tax Amount Declared
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="finalDeclaredAmount"
                  value={form.finalDeclaredAmount}
                  onChange={update}
                  required
                />
              </label>
            </div>
            <p className="crm-tax-form-warning">
              This locks the historical return figures. It does
              not mark a payable tax as paid.
            </p>
          </>
        )}

        {mode === "mark_paid" && (
          <>
            <div className="crm-tax-form-grid">
              <label>
                Date Paid
                <input
                  type="datetime-local"
                  name="paidAt"
                  value={form.paidAt}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Amount Paid
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  name="amount"
                  value={form.amount}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Payment Method
                <input
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={update}
                  required
                />
              </label>
              <label>
                Payment Reference
                <input
                  name="paymentReference"
                  value={form.paymentReference}
                  onChange={update}
                />
              </label>
            </div>
            <p className="crm-tax-form-warning">
              Record only a payment that has actually been made.
            </p>
          </>
        )}

        <label>
          Notes
          <textarea
            name="notes"
            value={form.notes}
            onChange={update}
            rows="3"
          />
        </label>

        <footer>
          <button
            type="button"
            className="crm-tax-button secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="crm-tax-button primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : title}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function ExpenseModal({ onClose, onSave, isSaving }) {
  const [form, setForm] = useState(EMPTY_EXPENSE);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const applicable =
    form.withholdingApplicable === "YES";
  const ewt = applicable
    ? Number(form.grossAmount || 0) *
      (Number(form.ewtRate || 0) / 100)
    : 0;

  return (
    <Modal
      title="Add Tax Expense"
      subtitle="Track expense and withholding applicability"
      onClose={onClose}
    >
      <form
        className="crm-tax-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            resource: "expense",
            ...form,
            withholdingApplicable:
              form.withholdingApplicable === ""
                ? null
                : applicable,
            ewtRate: Number(form.ewtRate || 0) / 100,
          });
        }}
      >
        <div className="crm-tax-form-grid">
          <label>
            Expense Date
            <input
              type="date"
              name="expenseDate"
              value={form.expenseDate}
              onChange={update}
              required
            />
          </label>
          <label>
            Supplier / Payee
            <input
              name="supplierPayee"
              value={form.supplierPayee}
              onChange={update}
              required
            />
          </label>
          <label>
            Description
            <input
              name="description"
              value={form.description}
              onChange={update}
              required
            />
          </label>
          <label>
            Category
            <select
              name="category"
              value={form.category}
              onChange={update}
            >
              <option value="RENT">Rent</option>
              <option value="SUPPLIES">Supplies</option>
              <option value="UTILITIES">Utilities</option>
              <option value="PROFESSIONAL_FEES">
                Professional Fees
              </option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label>
            Gross Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="grossAmount"
              value={form.grossAmount}
              onChange={update}
              required
            />
          </label>
          <label>
            Receipt / Invoice Reference
            <input
              name="receiptInvoiceReference"
              value={form.receiptInvoiceReference}
              onChange={update}
            />
          </label>
          <label>
            Withholding Applicable?
            <select
              name="withholdingApplicable"
              value={form.withholdingApplicable}
              onChange={update}
            >
              <option value="">For Verification</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </label>
          <label>
            EWT Rate (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              name="ewtRate"
              value={form.ewtRate}
              onChange={update}
              disabled={!applicable}
            />
          </label>
          <label>
            Withholding Status
            <select
              name="withholdingStatus"
              value={form.withholdingStatus}
              onChange={update}
            >
              <option value="FOR_VERIFICATION">
                For Verification
              </option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="WITHHELD">Withheld</option>
              <option value="REMITTED">Remitted</option>
              <option value="NOT_APPLICABLE">
                Not Applicable
              </option>
            </select>
          </label>
          <label>
            Tax Period
            <input
              name="taxPeriod"
              placeholder="2026-Q3"
              value={form.taxPeriod}
              onChange={update}
              required
            />
          </label>
        </div>

        <div className="crm-tax-expense-preview">
          <span>Potential EWT</span>
          <strong>{money(ewt)}</strong>
          <small>
            This is not treated as remitted unless you select
            Remitted.
          </small>
        </div>

        <label>
          Notes
          <textarea
            name="notes"
            value={form.notes}
            onChange={update}
            rows="3"
          />
        </label>

        <footer>
          <button
            type="button"
            className="crm-tax-button secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="crm-tax-button primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Add Expense"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function TaxTab() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("DASHBOARD");
  const [modal, setModal] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await adminFetch("/api/admin-tax");
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load Tax / BIR."
        );
      }

      setDashboard(data);
    } catch (loadError) {
      console.error("Tax dashboard failed:", loadError);
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      loadDashboard,
      0
    );
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const save = async (payload, method = "PATCH") => {
    try {
      setIsSaving(true);
      setError("");
      const response = await adminFetch(
        "/api/admin-tax",
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data.error || "Tax record could not be saved."
        );
      }

      setDashboard(data.dashboard);
      setModal(null);
    } catch (saveError) {
      console.error("Tax record save failed:", saveError);
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const summary = dashboard?.summary || {};
  const quarter = summary.currentQuarter || {};
  const year = summary.currentYear || {};
  const next = dashboard?.nextFiling;
  const overdue = dashboard?.overdue || [];
  const obligations = dashboard?.obligations || [];
  const expenses = dashboard?.expenses || [];
  const adjustments = dashboard?.adjustments || [];
  const reminders = dashboard?.reminders || [];

  const currentSnapshot = obligations.filter((item) =>
    [
      "2026-05",
      "2026-Q2",
    ].includes(item.period_key)
  );

  if (isLoading && !dashboard) {
    return (
      <div className="crm-tax-loading">
        <RefreshCw size={22} className="is-spinning" />
        <p>Preparing your BIR compliance view...</p>
      </div>
    );
  }

  return (
    <section className="crm-tax-page">
      <div className="crm-tax-disclaimer">
        <ShieldCheck size={19} />
        <div>
          <strong>Compliance tracker and estimator</strong>
          <span>
            Nothing is submitted to BIR automatically. Filing,
            payment, penalties, and deadline extensions require
            your confirmation.
          </span>
        </div>
        <button
          type="button"
          className="crm-tax-refresh"
          onClick={loadDashboard}
          disabled={isLoading}
        >
          <RefreshCw
            size={16}
            className={isLoading ? "is-spinning" : ""}
          />
          Refresh
        </button>
      </div>

      {dashboard?.notificationSettings?.emailConfigured && (
        <div className="crm-tax-email-active">
          <BadgeCheck size={17} />
          <span>
            Email reminders are configured for{" "}
            <strong>
              {dashboard.notificationSettings.recipient}
            </strong>{" "}
            · Google trigger activation required
          </span>
        </div>
      )}

      {error && (
        <div className="crm-tax-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <nav className="crm-tax-view-tabs">
        {[
          ["DASHBOARD", "Dashboard"],
          ["CALENDAR", "Tax Calendar"],
          ["EXPENSES", "Expenses & EWT"],
          ["CIRCULARS", "BIR Circulars"],
          ["HISTORY", "History"],
        ].map(([value, title]) => (
          <button
            key={value}
            type="button"
            className={
              activeView === value ? "is-active" : ""
            }
            onClick={() => setActiveView(value)}
          >
            {title}
          </button>
        ))}
      </nav>

      {activeView === "DASHBOARD" && (
        <>
          <div className="crm-tax-priority-grid">
            <article className="crm-tax-priority-card is-next">
              <span className="crm-tax-card-icon">
                <CalendarClock size={22} />
              </span>
              <div className="crm-tax-card-heading">
                <p>Next Filing</p>
                <h2>{next?.form_code || "No filing"}</h2>
                <span>{next?.period_label || "-"}</span>
              </div>
              {next && (
                <div className="crm-tax-priority-details">
                  <Metric
                    label="Due Date"
                    value={formatDate(
                      next.effective_due_date
                    )}
                    detail={
                      next.days_remaining === 0
                        ? "Due today"
                        : `${next.days_remaining} days remaining`
                    }
                  />
                  <Metric
                    label="Estimated Amount"
                    value={money(next.amount_due)}
                    detail="Basic amount only"
                  />
                  <div className="crm-tax-status-pair">
                    <StatusPill
                      value={next.filing_status}
                    />
                    <StatusPill
                      kind="payment"
                      value={next.payment_status}
                    />
                  </div>
                </div>
              )}
            </article>

            <article className="crm-tax-priority-card is-overdue">
              <span className="crm-tax-card-icon">
                <AlertTriangle size={22} />
              </span>
              <div className="crm-tax-card-heading">
                <p>Overdue</p>
                <h2>{summary.overdueCount || 0}</h2>
                <span>
                  {overdue.length
                    ? overdue
                        .map((item) => item.form_code)
                        .join(" · ")
                    : "No overdue returns"}
                </span>
              </div>
              <div className="crm-tax-priority-details">
                <Metric
                  label="Estimated Basic Outstanding"
                  value={money(summary.overdueBasicTax)}
                  detail="Excludes unverified penalties"
                />
                {overdue.slice(0, 2).map((item) => (
                  <div
                    className="crm-tax-overdue-line"
                    key={item.id}
                  >
                    <strong>
                      {item.form_code} {item.period_label}
                    </strong>
                    <span>
                      {Math.abs(item.days_remaining)} days
                      overdue
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="crm-tax-priority-card is-paid">
              <span className="crm-tax-card-icon">
                <BadgeCheck size={22} />
              </span>
              <div className="crm-tax-card-heading">
                <p>Taxes Paid</p>
                <h2>{money(summary.taxesPaid)}</h2>
                <span>Confirmed payments only</span>
              </div>
              <div className="crm-tax-priority-details">
                <Metric
                  label="Potential Outstanding"
                  value={money(
                    summary.estimatedOutstanding
                  )}
                  detail="Calculated, not final BIR liability"
                />
              </div>
            </article>
          </div>

          {reminders.length > 0 && (
            <article className="crm-tax-panel crm-tax-reminder-panel">
              <header>
                <div>
                  <p>Compliance Reminders</p>
                  <h3>Action Required</h3>
                </div>
                <CalendarClock size={21} />
              </header>
              <div className="crm-tax-reminder-list">
                {reminders.map((reminder) => (
                  <div
                    key={`${reminder.obligationId}-${reminder.type}`}
                    className={
                      reminder.level === "OVERDUE"
                        ? "is-overdue"
                        : ""
                    }
                  >
                    <AlertTriangle size={16} />
                    <div>
                      <strong>
                        {reminder.formCode} - {reminder.periodLabel}
                      </strong>
                      <span>{reminder.message}</span>
                    </div>
                    <b>{reminder.type}</b>
                  </div>
                ))}
              </div>
            </article>
          )}

          <div className="crm-tax-period-grid">
            <article className="crm-tax-panel">
              <header>
                <div>
                  <p>Current Period</p>
                  <h3>This Quarter - {quarter.periodKey}</h3>
                </div>
                <CircleDollarSign size={21} />
              </header>
              <div className="crm-tax-metric-grid">
                <Metric
                  label="System Sales"
                  value={money(quarter.grossSales)}
                  detail="From existing CRM payments"
                />
                <Metric
                  label="Tax-Declared Sales"
                  value={
                    quarter.taxDeclaredGrossSales === null
                      ? "Not reviewed"
                      : money(
                          quarter.taxDeclaredGrossSales
                        )
                  }
                />
                <Metric
                  label="Expenses"
                  value={money(quarter.expenses)}
                />
                <Metric
                  label="Rent"
                  value={money(quarter.rent)}
                />
                <Metric
                  label="Estimated 3% Tax"
                  value={money(
                    quarter.estimatedPercentageTax
                  )}
                />
                <Metric
                  label="Estimated Taxable Income"
                  value={money(
                    quarter.estimatedTaxableIncome
                  )}
                  detail={`${money(quarter.osd)} OSD`}
                />
                <Metric
                  label="EWT Withheld"
                  value={money(quarter.ewtWithheld)}
                />
                <Metric
                  label="EWT Remaining"
                  value={money(quarter.ewtRemaining)}
                />
              </div>
            </article>

            <article className="crm-tax-panel">
              <header>
                <div>
                  <p>Year to Date</p>
                  <h3>{year.year} Tax Position</h3>
                </div>
                <Landmark size={21} />
              </header>
              <div className="crm-tax-metric-grid">
                <Metric
                  label="YTD System Sales"
                  value={money(year.grossSales)}
                />
                <Metric
                  label="YTD Declared Sales"
                  value={money(
                    year.taxDeclaredGrossSales
                  )}
                />
                <Metric
                  label="YTD Expenses"
                  value={money(year.expenses)}
                />
                <Metric
                  label="40% OSD Estimate"
                  value={money(year.osd)}
                />
                <Metric
                  label="Confirmed Taxes Paid"
                  value={money(year.taxesPaid)}
                />
                <Metric
                  label="Potential Outstanding"
                  value={money(
                    year.estimatedOutstanding
                  )}
                />
                <Metric
                  label="Upcoming Filings"
                  value={year.upcomingFilings || 0}
                />
                <Metric
                  label="RDO"
                  value={dashboard.profile?.rdo_code || "-"}
                  detail="Antique"
                />
              </div>
            </article>
          </div>

          <article className="crm-tax-panel crm-tax-snapshot-panel">
            <header>
              <div>
                <p>Initial Compliance Snapshot</p>
                <h3>May and Q2 2026</h3>
              </div>
              <FileCheck2 size={21} />
            </header>
            <div className="crm-tax-snapshot-grid">
              {currentSnapshot.map((item) => (
                <div key={item.id}>
                  <strong>{item.form_code}</strong>
                  <span>{item.period_label}</span>
                  <b>{money(item.amount_due)}</b>
                  <StatusPill
                    value={item.filing_status}
                  />
                </div>
              ))}
            </div>
          </article>
        </>
      )}

      {activeView === "CALENDAR" && (
        <article className="crm-tax-panel crm-tax-table-panel">
          <header>
            <div>
              <p>Registered Obligations</p>
              <h3>Tax Calendar & Filing Workflow</h3>
            </div>
            <FileText size={21} />
          </header>
          <div className="crm-tax-table-wrap">
            <table className="crm-tax-table">
              <thead>
                <tr>
                  <th>Return</th>
                  <th>Period</th>
                  <th>Due</th>
                  <th>System / Declared Sales</th>
                  <th>Estimated</th>
                  <th>Filing</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.filing_status === "OVERDUE"
                        ? "is-overdue"
                        : ""
                    }
                  >
                    <td>
                      <strong>{item.form_code}</strong>
                      <span>{item.tax_type}</span>
                    </td>
                    <td>{item.period_label}</td>
                    <td>
                      <strong>
                        {formatDate(
                          item.effective_due_date
                        )}
                      </strong>
                      <span>
                        {item.days_remaining < 0
                          ? `${Math.abs(
                              item.days_remaining
                            )} days overdue`
                          : `${item.days_remaining} days left`}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {money(item.system_gross_sales)}
                      </strong>
                      <span>
                        {item.tax_declared_gross_sales === null
                          ? "Not reviewed"
                          : money(
                              item.tax_declared_gross_sales
                            )}
                      </span>
                    </td>
                    <td>
                      <strong>{money(item.amount_due)}</strong>
                      <span>Basic amount</span>
                    </td>
                    <td>
                      <StatusPill
                        value={item.filing_status}
                      />
                    </td>
                    <td>
                      <StatusPill
                        kind="payment"
                        value={item.payment_status}
                      />
                    </td>
                    <td>
                      <div className="crm-tax-row-actions">
                        {!item.historical_locked &&
                          ![
                            "FILED",
                            "COMPLETED",
                          ].includes(
                            item.filing_status
                          ) && (
                            <button
                              type="button"
                              onClick={() =>
                                setModal({
                                  mode: "prepare",
                                  obligation: item,
                                })
                              }
                            >
                              Prepare
                            </button>
                          )}
                        {item.filing_status === "PREPARED" && (
                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                mode: "mark_filed",
                                obligation: item,
                              })
                            }
                          >
                            Mark Filed
                          </button>
                        )}
                        {item.filing_status === "FILED" &&
                          ![
                            "PAID",
                            "NO_PAYMENT_REQUIRED",
                          ].includes(item.payment_status) && (
                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                mode: "mark_paid",
                                obligation: item,
                              })
                            }
                          >
                            Record Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {activeView === "EXPENSES" && (
        <article className="crm-tax-panel crm-tax-table-panel">
          <header>
            <div>
              <p>Expense Reconciliation</p>
              <h3>Expenses & Expanded Withholding Tax</h3>
            </div>
            <button
              type="button"
              className="crm-tax-button primary compact"
              onClick={() =>
                setModal({ mode: "expense" })
              }
            >
              <Plus size={15} /> Add Expense
            </button>
          </header>
          <div className="crm-tax-table-wrap">
            <table className="crm-tax-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payee / Description</th>
                  <th>Category</th>
                  <th>Gross</th>
                  <th>EWT</th>
                  <th>Net Paid</th>
                  <th>Withholding Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.expense_date)}</td>
                    <td>
                      <strong>{expense.supplier_payee}</strong>
                      <span>{expense.description}</span>
                    </td>
                    <td>{label(expense.category)}</td>
                    <td>{money(expense.gross_amount)}</td>
                    <td>
                      <strong>{money(expense.ewt_amount)}</strong>
                      <span>
                        {Number(expense.ewt_rate || 0) * 100}%
                      </span>
                    </td>
                    <td>{money(expense.net_amount_paid)}</td>
                    <td>
                      <StatusPill
                        kind="payment"
                        value={expense.withholding_status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {activeView === "CIRCULARS" && (
        <div className="crm-tax-circular-list">
          {adjustments.map((item) => (
            <article className="crm-tax-panel" key={item.id}>
              <header>
                <div>
                  <p>Deadline Adjustment</p>
                  <h3>{item.circular_number}</h3>
                </div>
                <StatusPill
                  value={item.applicability_status}
                />
              </header>
              <p className="crm-tax-circular-description">
                {item.description}
              </p>
              <div className="crm-tax-circular-grid">
                <Metric
                  label="Circular Date"
                  value={formatDate(item.circular_date)}
                />
                <Metric
                  label="Original Deadline"
                  value={formatDate(item.original_deadline)}
                />
                <Metric
                  label="Possible Extension"
                  value={formatDate(item.extended_deadline)}
                />
                <Metric
                  label="Forms"
                  value={item.applicable_forms.join(", ")}
                />
              </div>
              <p className="crm-tax-circular-note">
                {item.applicable_rdos_areas}
              </p>
              <div className="crm-tax-circular-controls">
                <label>
                  Applicability to Abelle Studios
                  <select
                    value={item.applicability_status}
                    onChange={(event) =>
                      save({
                        resource: "deadline_adjustment",
                        id: item.id,
                        applicabilityStatus:
                          event.target.value,
                        notes: item.notes,
                        sourceReference:
                          item.source_reference,
                      })
                    }
                    disabled={isSaving}
                  >
                    <option value="PENDING_VERIFICATION">
                      Pending Verification
                    </option>
                    <option value="APPLICABLE">
                      Applicable
                    </option>
                    <option value="NOT_APPLICABLE">
                      Not Applicable
                    </option>
                  </select>
                </label>
              </div>
              <small className="crm-tax-source-note">
                Source: {item.source_reference}
              </small>
            </article>
          ))}
        </div>
      )}

      {activeView === "HISTORY" && (
        <article className="crm-tax-panel">
          <header>
            <div>
              <p>Audit Trail</p>
              <h3>Recent Tax Record Changes</h3>
            </div>
            <ReceiptText size={21} />
          </header>
          <div className="crm-tax-history-list">
            {(dashboard?.audit || []).map((item) => (
              <div key={item.id}>
                <span className="crm-tax-history-icon">
                  <WalletCards size={15} />
                </span>
                <div>
                  <strong>{label(item.action)}</strong>
                  <span>
                    {label(item.entity_type)} · {formatDate(
                      item.created_at
                    )}
                  </span>
                  {item.change_notes && (
                    <p>{item.change_notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      {modal?.obligation && (
        <ObligationModal
          mode={modal.mode}
          obligation={modal.obligation}
          onClose={() => setModal(null)}
          onSave={save}
          isSaving={isSaving}
        />
      )}

      {modal?.mode === "expense" && (
        <ExpenseModal
          onClose={() => setModal(null)}
          onSave={(payload) => save(payload, "POST")}
          isSaving={isSaving}
        />
      )}
    </section>
  );
}

export default TaxTab;
