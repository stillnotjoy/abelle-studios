import {
  AlertCircle,
  CalendarCheck2,
  CircleDollarSign,
  CreditCard,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { adminFetch } from "./adminApi";
import "./RevenueCRM.css";

const RANGE_OPTIONS = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "LAST_12_MONTHS", label: "Last 12 months" },
  { value: "ALL_TIME", label: "All time" },
  { value: "CUSTOM", label: "Custom dates" },
];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (preset === "ALL_TIME") {
    return { start: "", end: "" };
  }

  if (preset === "LAST_MONTH") {
    return {
      start: dateKey(new Date(year, month - 1, 1)),
      end: dateKey(new Date(year, month, 0)),
    };
  }

  if (preset === "THIS_YEAR") {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }

  if (preset === "LAST_12_MONTHS") {
    return {
      start: dateKey(new Date(year, month - 11, 1)),
      end: dateKey(new Date(year, month + 1, 0)),
    };
  }

  return {
    start: dateKey(new Date(year, month, 1)),
    end: dateKey(new Date(year, month + 1, 0)),
  };
}

function money(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTrendLabel(key) {
  if (!key) {
    return "";
  }

  if (key.length === 7) {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      year: "2-digit",
    }).format(new Date(`${key}-01T12:00:00`));
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${key}T12:00:00`));
}

function cleanLabel(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function SummaryCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`crm-revenue-summary-card ${tone || ""}`}>
      <span className="crm-revenue-summary-icon">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function BreakdownList({ rows, emptyMessage }) {
  const maximum = Math.max(
    ...rows.map((row) => Number(row.amount || 0)),
    1
  );

  if (!rows.length) {
    return <p className="crm-revenue-empty-small">{emptyMessage}</p>;
  }

  return (
    <div className="crm-revenue-breakdown-list">
      {rows.map((row) => (
        <div className="crm-revenue-breakdown-row" key={row.label}>
          <div>
            <strong>{cleanLabel(row.label)}</strong>
            <span>{row.count} {row.count === 1 ? "entry" : "entries"}</span>
          </div>
          <b>{money(row.amount)}</b>
          <span className="crm-revenue-breakdown-track">
            <i
              style={{
                width: `${Math.max(
                  (Number(row.amount || 0) / maximum) * 100,
                  3
                )}%`,
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function RevenueTab() {
  const [rangePreset, setRangePreset] = useState("THIS_MONTH");
  const [customStart, setCustomStart] = useState(
    () => getPresetRange("THIS_MONTH").start
  );
  const [customEnd, setCustomEnd] = useState(
    () => getPresetRange("THIS_MONTH").end
  );
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const activeRange = useMemo(
    () =>
      rangePreset === "CUSTOM"
        ? { start: customStart, end: customEnd }
        : getPresetRange(rangePreset),
    [rangePreset, customStart, customEnd]
  );

  const loadReport = useCallback(async () => {
    if (
      rangePreset === "CUSTOM" &&
      (!activeRange.start ||
        !activeRange.end ||
        activeRange.start > activeRange.end)
    ) {
      setError("Choose a valid start and end date.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const query = new URLSearchParams();
      if (activeRange.start && activeRange.end) {
        query.set("start", activeRange.start);
        query.set("end", activeRange.end);
      }

      const response = await adminFetch(
        `/api/admin-revenue-report${
          query.toString() ? `?${query.toString()}` : ""
        }`
      );
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load the revenue report."
        );
      }

      setReport(data);
    } catch (loadError) {
      console.error("Revenue report loading failed:", loadError);
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeRange.start, activeRange.end, rangePreset]);

  useEffect(() => {
    const loadTimer = window.setTimeout(loadReport, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadReport]);

  const summary = report?.summary || {};
  const trend = report?.trend || [];
  const trendMaximum = Math.max(
    ...trend.map((item) => Math.abs(Number(item.amount || 0))),
    1
  );

  return (
    <section className="crm-revenue-page">
      <div className="crm-revenue-toolbar">
        <div className="crm-revenue-range-controls">
          <label>
            Report Period
            <select
              value={rangePreset}
              onChange={(event) => setRangePreset(event.target.value)}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {rangePreset === "CUSTOM" && (
            <>
              <label>
                From
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                />
              </label>
            </>
          )}
        </div>

        <button
          type="button"
          className="crm-revenue-refresh"
          onClick={loadReport}
          disabled={isLoading}
        >
          <RefreshCw
            size={15}
            className={isLoading ? "crm-revenue-spinning" : ""}
          />
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="crm-revenue-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading && !report ? (
        <div className="crm-revenue-loading">
          <RefreshCw size={24} className="crm-revenue-spinning" />
          <p>Calculating your revenue report...</p>
        </div>
      ) : (
        <>
          <div className="crm-revenue-summary-grid">
            <SummaryCard
              icon={WalletCards}
              label="Collected"
              value={money(summary.netCollected)}
              detail={`${summary.paymentCount || 0} recorded payments`}
              tone="is-green"
            />
            <SummaryCard
              icon={CalendarCheck2}
              label="Booked Sales"
              value={money(summary.bookedSales)}
              detail={`${summary.bookingCount || 0} shoots in this period`}
              tone="is-gold"
            />
            <SummaryCard
              icon={CircleDollarSign}
              label="Outstanding"
              value={money(summary.outstandingBalance)}
              detail="Still due on these shoots"
              tone="is-red"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Collection Rate"
              value={`${Number(summary.collectionRate || 0).toFixed(1)}%`}
              detail={`Average booking ${money(summary.averageBookingValue)}`}
              tone="is-blue"
            />
          </div>

          {Number(report?.dataQuality?.historicalCount || 0) > 0 && (
            <div className="crm-revenue-history-note">
              <AlertCircle size={17} />
              <p>
                <strong>Historical data included:</strong>{" "}
                {report.dataQuality.historicalCount} imported payment totals
                ({money(report.dataQuality.historicalAmount)}) use their shoot
                dates because the old CRM did not save each payment date.
                Payments recorded from now on will use the exact payment date.
              </p>
            </div>
          )}

          <div className="crm-revenue-main-grid">
            <article className="crm-revenue-panel crm-revenue-trend-panel">
              <div className="crm-revenue-panel-heading">
                <div>
                  <p>Cash Flow</p>
                  <h2>Revenue Trend</h2>
                </div>
                <strong>{money(summary.netCollected)}</strong>
              </div>

              {trend.length ? (
                <div className="crm-revenue-chart">
                  {trend.map((item) => (
                    <div className="crm-revenue-chart-column" key={item.key}>
                      <span className="crm-revenue-chart-value">
                        {money(item.amount)}
                      </span>
                      <span className="crm-revenue-chart-track">
                        <i
                          style={{
                            height: `${Math.max(
                              (Math.abs(Number(item.amount || 0)) /
                                trendMaximum) *
                                100,
                              4
                            )}%`,
                          }}
                        />
                      </span>
                      <small>{formatTrendLabel(item.key)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="crm-revenue-panel-empty">
                  <TrendingUp size={25} />
                  <p>No payments recorded in this period.</p>
                </div>
              )}
            </article>

            <article className="crm-revenue-panel">
              <div className="crm-revenue-panel-heading">
                <div>
                  <p>Collections</p>
                  <h2>Payment Methods</h2>
                </div>
                <CreditCard size={20} />
              </div>
              <BreakdownList
                rows={report?.paymentMethods || []}
                emptyMessage="No payment methods to show."
              />
            </article>

            <article className="crm-revenue-panel">
              <div className="crm-revenue-panel-heading">
                <div>
                  <p>Sales Mix</p>
                  <h2>Booking Sources</h2>
                </div>
                <CalendarCheck2 size={20} />
              </div>
              <BreakdownList
                rows={report?.bookingSources || []}
                emptyMessage="No booking sources to show."
              />
            </article>
          </div>

          <article className="crm-revenue-panel crm-revenue-transactions-panel">
            <div className="crm-revenue-panel-heading">
              <div>
                <p>Ledger</p>
                <h2>Recent Payments</h2>
              </div>
              <span>{report?.recentTransactions?.length || 0} shown</span>
            </div>

            {report?.recentTransactions?.length ? (
              <div className="crm-revenue-table-wrap">
                <table className="crm-revenue-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Booking</th>
                      <th>Method</th>
                      <th>Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recentTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.payment_date)}</td>
                        <td>
                          <strong>{transaction.client_name || "—"}</strong>
                          <span>{transaction.package_title || "—"}</span>
                        </td>
                        <td>{transaction.booking_reference}</td>
                        <td>{cleanLabel(transaction.payment_method)}</td>
                        <td>
                          <span
                            className={`crm-revenue-transaction-type ${
                              transaction.source ===
                              "HISTORICAL_OPENING_BALANCE"
                                ? "is-history"
                                : ""
                            }`}
                          >
                            {transaction.source ===
                            "HISTORICAL_OPENING_BALANCE"
                              ? "Imported"
                              : transaction.transaction_type === "REFUND"
                                ? "Refund"
                                : "Payment"}
                          </span>
                        </td>
                        <td
                          className={
                            transaction.transaction_type === "REFUND"
                              ? "is-refund"
                              : ""
                          }
                        >
                          {transaction.transaction_type === "REFUND" ? "−" : ""}
                          {money(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="crm-revenue-panel-empty">
                <WalletCards size={25} />
                <p>No payments recorded in this period.</p>
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}

export default RevenueTab;
