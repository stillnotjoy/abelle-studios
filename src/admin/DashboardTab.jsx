import {
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  Cake,
  CircleDollarSign,
  Clock3,
  Megaphone,
  MessageSquareText,
  RefreshCw,
  Star,
  Store,
  UsersRound,
  WalletCards,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { adminFetch } from "./adminApi";

function readJsonResponse(response) {
  return response.text().then((text) => {
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }
  });
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  return `${year}-${month}`;
}

function getBookingDateKey(booking) {
  return String(
    booking?.shoot_date || ""
  ).slice(0, 10);
}

function getBookingDateTime(booking) {
  const date = getBookingDateKey(booking);

  const time = String(
    booking?.shoot_time || "00:00"
  ).slice(0, 5);

  if (!date) {
    return new Date(0);
  }

  return new Date(`${date}T${time}:00`);
}

function formatCurrency(value) {
  return `₱${Number(
    value || 0
  ).toLocaleString("en-PH")}`;
}

function formatTime(timeValue) {
  const value = String(
    timeValue || ""
  ).slice(0, 5);

  const [hourText, minute = "00"] =
    value.split(":");

  const hour = Number(hourText);

  if (!Number.isFinite(hour)) {
    return value || "Time not set";
  }

  const displayHour =
    hour % 12 || 12;

  const period =
    hour >= 12 ? "PM" : "AM";

  return `${displayHour}:${minute} ${period}`;
}

function formatBookingDate(dateValue) {
  const value = String(
    dateValue || ""
  ).slice(0, 10);

  if (!value) {
    return "Date not set";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

function getPaymentLabel(status) {
  if (status === "PAID") {
    return "Paid";
  }

  if (status === "PARTIAL") {
    return "Partial Payment";
  }

  if (status === "UNPAID") {
    return "Pay in Studio";
  }

  return status || "Pending";
}

function getPaymentClass(status) {
  if (status === "PAID") {
    return "paid";
  }

  if (status === "PARTIAL") {
    return "partial";
  }

  if (status === "UNPAID") {
    return "studio";
  }

  return "pending";
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "neutral",
}) {
  return (
    <article className="crm-metric-card">
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{caption}</span>
      </div>

      <div
        className={`crm-metric-icon crm-metric-icon-${tone}`}
      >
        <Icon
          size={20}
          strokeWidth={1.7}
        />
      </div>
    </article>
  );
}

function EmptyDashboardState({
  message,
}) {
  return (
    <div className="crm-dashboard-empty">
      <CalendarDays
        size={22}
        strokeWidth={1.5}
      />

      <p>{message}</p>
    </div>
  );
}

function DashboardTab({
  onNavigate,
  onCreateBooking,
}) {

  const [bookings, setBookings] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const currentDate = new Date();

  const currentHour =
    currentDate.getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  const todayLabel =
    new Intl.DateTimeFormat(
      "en-PH",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    ).format(currentDate);

  const loadDashboard = useCallback(
    async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await adminFetch(
          "/api/admin-manual-bookings",
          {}
        );

        const data =
          await readJsonResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not load dashboard data."
          );
        }

        setBookings(
          Array.isArray(data.bookings)
            ? data.bookings
            : []
        );
      } catch (loadError) {
        console.error(
          "Dashboard loading failed:",
          loadError
        );

        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboardData = useMemo(() => {
    const todayKey =
      getLocalDateKey();

    const currentMonthKey =
      getMonthKey();

    const sortedBookings = [
      ...bookings,
    ].sort(
      (first, second) =>
        getBookingDateTime(first) -
        getBookingDateTime(second)
    );

    const upcomingBookings =
      sortedBookings.filter(
        (booking) =>
          getBookingDateKey(
            booking
          ) >= todayKey
      );

    const todayBookings =
      sortedBookings.filter(
        (booking) =>
          getBookingDateKey(
            booking
          ) === todayKey
      );

    const monthlyBookings =
      bookings.filter(
        (booking) =>
          getBookingDateKey(
            booking
          ).startsWith(
            currentMonthKey
          )
      );

    const revenueCollected =
      monthlyBookings.reduce(
        (total, booking) =>
          total +
          Number(
            booking.amount_paid || 0
          ),
        0
      );

    const expectedPayInStudio =
      upcomingBookings.reduce(
        (total, booking) => {
          if (
            booking.payment_status !==
            "UNPAID"
          ) {
            return total;
          }

          return (
            total +
            Number(
              booking.remaining_balance ||
                0
            )
          );
        },
        0
      );

    const outstandingBalance =
      upcomingBookings.reduce(
        (total, booking) =>
          total +
          Number(
            booking.remaining_balance ||
              0
          ),
        0
      );

    const outstandingPayments =
      upcomingBookings
        .filter(
          (booking) =>
            Number(
              booking.remaining_balance ||
                0
            ) > 0
        )
        .slice(0, 5);

    const paidCount =
      upcomingBookings.filter(
        (booking) =>
          booking.payment_status ===
          "PAID"
      ).length;

    const partialCount =
      upcomingBookings.filter(
        (booking) =>
          booking.payment_status ===
          "PARTIAL"
      ).length;

    const payInStudioCount =
      upcomingBookings.filter(
        (booking) =>
          booking.payment_status ===
          "UNPAID"
      ).length;

    return {
      todayBookings,
      upcomingBookings:
        upcomingBookings.slice(0, 5),

      outstandingPayments,
      revenueCollected,
      expectedPayInStudio,
      outstandingBalance,
      confirmedBookings:
        upcomingBookings.length,

      paidCount,
      partialCount,
      payInStudioCount,
    };
  }, [bookings]);

  return (
    <div className="crm-dashboard">
      <div className="crm-dashboard-toolbar">
  <div className="crm-dashboard-welcome">
    <p className="crm-dashboard-eyebrow">
      {todayLabel}
    </p>

    <h1>
      {greeting}, Gabrielle
    </h1>

    <p>
      Here&apos;s what&apos;s happening
      with Abelle Studios today.
    </p>
  </div>

        <div className="crm-dashboard-toolbar-actions">
          <button
            type="button"
            className="crm-dashboard-refresh"
            onClick={loadDashboard}
            disabled={isLoading}
          >
            <RefreshCw
              size={17}
              strokeWidth={1.8}
              className={
                isLoading
                  ? "crm-icon-spinning"
                  : ""
              }
            />

            Refresh
          </button>

         <button
  type="button"
  className="crm-dashboard-primary-action"
  onClick={onCreateBooking}
>
            <CalendarCheck2
              size={17}
              strokeWidth={1.8}
            />

            New Booking
          </button>
        </div>
      </div>

      {error && (
        <div className="crm-dashboard-error">
          {error}
        </div>
      )}

      <section className="crm-metric-grid">
        <MetricCard
          label="Confirmed Bookings"
          value={
            isLoading
              ? "—"
              : dashboardData.confirmedBookings
          }
          caption="Upcoming manual bookings"
          icon={CalendarCheck2}
          tone="gold"
        />

        <MetricCard
          label="Revenue Collected"
          value={
            isLoading
              ? "—"
              : formatCurrency(
                  dashboardData.revenueCollected
                )
          }
          caption="Manual payments this month"
          icon={WalletCards}
          tone="green"
        />

        <MetricCard
          label="Expected Pay in Studio"
          value={
            isLoading
              ? "—"
              : formatCurrency(
                  dashboardData.expectedPayInStudio
                )
          }
          caption="Expected from upcoming sessions"
          icon={Store}
          tone="gold"
        />

        <MetricCard
          label="Outstanding Balance"
          value={
            isLoading
              ? "—"
              : formatCurrency(
                  dashboardData.outstandingBalance
                )
          }
          caption="Remaining on upcoming bookings"
          icon={CircleDollarSign}
          tone="red"
        />
      </section>

      <section className="crm-dashboard-layout">
        <div className="crm-dashboard-main-column">
          <article className="crm-dashboard-card">
            <div className="crm-card-heading">
              <div>
                <h3>
                  Upcoming Bookings
                </h3>

                <p>
                  Your next confirmed
                  studio sessions
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigate?.(
                    "Bookings"
                  )
                }
              >
                View all
                <ArrowUpRight
                  size={15}
                />
              </button>
            </div>

            {isLoading ? (
              <EmptyDashboardState
                message="Loading upcoming bookings..."
              />
            ) : dashboardData
                .upcomingBookings
                .length === 0 ? (
              <EmptyDashboardState
                message="No upcoming manual bookings."
              />
            ) : (
              <div className="crm-booking-list">
                {dashboardData.upcomingBookings.map(
                  (booking) => (
                    <div
                      className="crm-booking-list-item"
                      key={booking.id}
                    >
                      <div className="crm-booking-date">
                        <span>
                          {formatBookingDate(
                            booking.shoot_date
                          )
                            .split(" ")[0]
                            .toUpperCase()}
                        </span>

                        <strong>
                          {new Date(
                            `${getBookingDateKey(
                              booking
                            )}T00:00:00`
                          ).getDate()}
                        </strong>
                      </div>

                      <div className="crm-booking-person">
                        <strong>
                          {
                            booking.client_name
                          }
                        </strong>

                        <span>
                          {
                            booking.package_title
                          }
                        </span>
                      </div>

                      <div className="crm-booking-time">
                        <Clock3
                          size={15}
                        />

                        {formatTime(
                          booking.shoot_time
                        )}
                      </div>

                      <span
                        className={`crm-status-badge crm-status-${getPaymentClass(
                          booking.payment_status
                        )}`}
                      >
                        {getPaymentLabel(
                          booking.payment_status
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </article>

          <article className="crm-dashboard-card">
            <div className="crm-card-heading">
              <div>
                <h3>
                  Outstanding Payments
                </h3>

                <p>
                  Balances still expected
                  from clients
                </p>
              </div>
            </div>

            {isLoading ? (
              <EmptyDashboardState
                message="Loading outstanding balances..."
              />
            ) : dashboardData
                .outstandingPayments
                .length === 0 ? (
              <EmptyDashboardState
                message="No outstanding manual-booking balances."
              />
            ) : (
              <div className="crm-payment-list">
                {dashboardData.outstandingPayments.map(
                  (booking) => (
                    <div
                      className="crm-payment-item"
                      key={booking.id}
                    >
                      <div className="crm-payment-avatar">
                        {String(
                          booking.client_name ||
                            "C"
                        )
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="crm-payment-person">
                        <strong>
                          {
                            booking.client_name
                          }
                        </strong>

                        <span>
                          {
                            booking.package_title
                          }
                        </span>
                      </div>

                      <strong className="crm-payment-amount">
                        {formatCurrency(
                          booking.remaining_balance
                        )}
                      </strong>

                      <span
                        className={`crm-status-badge crm-status-${getPaymentClass(
                          booking.payment_status
                        )}`}
                      >
                        {getPaymentLabel(
                          booking.payment_status
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </article>

          <article className="crm-dashboard-card">
            <div className="crm-card-heading">
              <div>
                <h3>
                  Booking Status
                </h3>

                <p>
                  Payment position of
                  upcoming manual bookings
                </p>
              </div>
            </div>

            <div className="crm-status-overview">
              <div>
                <span className="crm-status-dot paid" />
                <p>Paid</p>
                <strong>
                  {
                    dashboardData.paidCount
                  }
                </strong>
              </div>

              <div>
                <span className="crm-status-dot partial" />
                <p>Partial</p>
                <strong>
                  {
                    dashboardData.partialCount
                  }
                </strong>
              </div>

              <div>
                <span className="crm-status-dot studio" />
                <p>Pay in Studio</p>
                <strong>
                  {
                    dashboardData.payInStudioCount
                  }
                </strong>
              </div>
            </div>
          </article>

          <article className="crm-dashboard-card">
            <div className="crm-card-heading">
              <div>
                <h3>
                  Quick Actions
                </h3>

                <p>
                  Common studio tasks
                </p>
              </div>
            </div>

            <div className="crm-quick-actions">
              <button
                type="button"
                onClick={() =>
                  onNavigate?.(
                    "Bookings"
                  )
                }
              >
                <CalendarCheck2 />
                <span>New Booking</span>
              </button>

              <button
                type="button"
                disabled
              >
                <UsersRound />
                <span>Add Customer</span>
                <small>Soon</small>
              </button>

              <button
                type="button"
                disabled
              >
                <CircleDollarSign />
                <span>Record Payment</span>
                <small>Soon</small>
              </button>

              <button
                type="button"
                disabled
              >
                <Megaphone />
                <span>Send Campaign</span>
                <small>Soon</small>
              </button>
            </div>
          </article>

          <article className="crm-dashboard-card">
            <div className="crm-card-heading">
              <div>
                <h3>
                  Coming Soon
                </h3>

                <p>
                  Planned CRM and marketing
                  features
                </p>
              </div>
            </div>

            <div className="crm-coming-soon-grid">
              <div>
                <MessageSquareText />
                <strong>
                  SMS Marketing
                </strong>
                <span>
                  Send studio promotions
                </span>
              </div>

              <div>
                <Cake />
                <strong>
                  Birthday Campaigns
                </strong>
                <span>
                  Automated greetings
                </span>
              </div>

              <div>
                <UsersRound />
                <strong>
                  Customer CRM
                </strong>
                <span>
                  Complete client history
                </span>
              </div>

              <div>
                <Star />
                <strong>
                  Review Requests
                </strong>
                <span>
                  Collect client reviews
                </span>
              </div>
            </div>
          </article>
        </div>

        <aside className="crm-dashboard-side-column">
          <article className="crm-dashboard-card">
            <div className="crm-card-heading">
              <div>
                <h3>
                  Today&apos;s Schedule
                </h3>

                <p>
                  {formatBookingDate(
                    getLocalDateKey()
                  )}
                </p>
              </div>

              <CalendarDays
                size={19}
                strokeWidth={1.6}
              />
            </div>

            {isLoading ? (
              <EmptyDashboardState
                message="Loading today's schedule..."
              />
            ) : dashboardData
                .todayBookings
                .length === 0 ? (
              <EmptyDashboardState
                message="No manual bookings scheduled today."
              />
            ) : (
              <div className="crm-today-list">
                {dashboardData.todayBookings.map(
                  (booking) => (
                    <div
                      className="crm-today-item"
                      key={booking.id}
                    >
                      <strong>
                        {formatTime(
                          booking.shoot_time
                        )}
                      </strong>

                      <div>
                        <p>
                          {
                            booking.client_name
                          }
                        </p>

                        <span>
                          {
                            booking.package_title
                          }
                        </span>
                      </div>

                      <span
                        className={`crm-status-badge crm-status-${getPaymentClass(
                          booking.payment_status
                        )}`}
                      >
                        {getPaymentLabel(
                          booking.payment_status
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </article>

          <article className="crm-dashboard-card">
            <div className="crm-card-heading">
              <div>
                <h3>
                  Recent Activity
                </h3>

                <p>
                  Latest manual bookings
                </p>
              </div>
            </div>

            {bookings.length === 0 ? (
              <EmptyDashboardState
                message="No recent activity yet."
              />
            ) : (
              <div className="crm-activity-list">
                {[...bookings]
                  .reverse()
                  .slice(0, 5)
                  .map((booking) => (
                    <div
                      className="crm-activity-item"
                      key={booking.id}
                    >
                      <div className="crm-activity-icon">
                        <CalendarCheck2
                          size={16}
                        />
                      </div>

                      <div>
                        <strong>
                          New booking
                        </strong>

                        <span>
                          {
                            booking.client_name
                          }{" "}
                          booked{" "}
                          {
                            booking.package_title
                          }
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}

export default DashboardTab;
