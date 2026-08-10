import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudCheck,
  CloudOff,
  Plus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSavedAdminPin } from "./adminConfig";
import "./CalendarCRM.css";

const WEEKDAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

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

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getBookingDateKey(booking) {
  return String(
    booking?.shoot_date || ""
  ).slice(0, 10);
}

function getMonthRange(month) {
  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  );
  const end = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    1
  );

  return {
    start: getDateKey(start),
    end: getDateKey(end),
  };
}

function getManilaDateTimeKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function normalizeEventId(value) {
  return String(value || "").trim();
}

function normalizeReference(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function formatTime(value) {
  const [hourText, minute = "00"] =
    String(value || "")
      .slice(0, 5)
      .split(":");
  const hour = Number(hourText);

  if (!Number.isFinite(hour)) {
    return value || "Time not set";
  }

  return `${hour % 12 || 12}:${minute} ${
    hour >= 12 ? "PM" : "AM"
  }`;
}

function formatSelectedDate(dateKey) {
  if (!dateKey) {
    return "Select a date";
  }

  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getPaymentTone(status) {
  if (status === "PAID") {
    return "paid";
  }

  if (status === "PARTIAL") {
    return "partial";
  }

  return "studio";
}

function getPaymentLabel(status) {
  if (status === "PAID") {
    return "Paid";
  }

  if (status === "PARTIAL") {
    return "Partial";
  }

  return "Pay in Studio";
}

function CalendarTab({
  onNavigate,
  onCreateBooking,
}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getDateKey(today);
  const [month, setMonth] = useState(
    () =>
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
  );
  const [selectedDate, setSelectedDate] =
    useState(todayKey);
  const [bookings, setBookings] =
    useState([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [calendarEvents, setCalendarEvents] =
    useState([]);
  const [isCheckingSync, setIsCheckingSync] =
    useState(false);
  const [syncError, setSyncError] =
    useState("");
  const [lastSyncCheck, setLastSyncCheck] =
    useState("");
  const adminPin = getSavedAdminPin();

  const loadBookings = useCallback(
    async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          "/api/admin-manual-bookings",
          {
            headers: {
              "x-admin-pin": adminPin,
            },
          }
        );
        const data =
          await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not load calendar bookings."
          );
        }

        setBookings(
          Array.isArray(data.bookings)
            ? data.bookings
            : []
        );
      } catch (loadError) {
        console.error(
          "Calendar loading failed:",
          loadError
        );
        setError(loadError.message);
      } finally {
        setIsLoading(false);
      }
    },
    [adminPin]
  );

  useEffect(() => {
    // Loading remote booking data is the intended effect here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBookings();
  }, [loadBookings]);

  const loadCalendarSync = useCallback(
    async () => {
      const range = getMonthRange(month);

      try {
        setIsCheckingSync(true);
        setSyncError("");

        const query =
          new URLSearchParams({
            start: range.start,
            end: range.end,
          });

        const response = await fetch(
          `/api/admin-calendar-sync?${query.toString()}`,
          {
            headers: {
              "x-admin-pin": adminPin,
            },
          }
        );
        const data =
          await readJsonResponse(response);

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              "Could not check Google Calendar."
          );
        }

        setCalendarEvents(
          Array.isArray(data.events)
            ? data.events
            : []
        );
        setLastSyncCheck(
          data.checkedAt ||
            new Date().toISOString()
        );
      } catch (syncLoadError) {
        console.error(
          "Google Calendar sync check failed:",
          syncLoadError
        );
        setCalendarEvents([]);
        setSyncError(syncLoadError.message);
      } finally {
        setIsCheckingSync(false);
      }
    },
    [adminPin, month]
  );

  useEffect(() => {
    // This effect checks the remote month whenever navigation changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalendarSync();
  }, [loadCalendarSync]);

  const bookingsByDate = useMemo(() => {
    const grouped = new Map();

    bookings.forEach((booking) => {
      const dateKey =
        getBookingDateKey(booking);

      if (!dateKey) {
        return;
      }

      const existing =
        grouped.get(dateKey) || [];
      existing.push(booking);
      grouped.set(dateKey, existing);
    });

    grouped.forEach((dateBookings) => {
      dateBookings.sort((first, second) =>
        String(first.shoot_time || "").localeCompare(
          String(second.shoot_time || "")
        )
      );
    });

    return grouped;
  }, [bookings]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      month.getFullYear(),
      month.getMonth(),
      1
    );
    const gridStart = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      1 - firstDay.getDay()
    );

    return Array.from(
      { length: 42 },
      (_, index) => {
        const date = new Date(gridStart);
        date.setDate(
          gridStart.getDate() + index
        );
        return date;
      }
    );
  }, [month]);

  const selectedBookings =
    bookingsByDate.get(selectedDate) || [];

  const monthBookingCount = useMemo(() => {
    const monthKey = `${month.getFullYear()}-${String(
      month.getMonth() + 1
    ).padStart(2, "0")}`;

    return bookings.filter((booking) =>
      getBookingDateKey(booking).startsWith(
        monthKey
      )
    ).length;
  }, [bookings, month]);

  const monthBookings = useMemo(() => {
    const range = getMonthRange(month);

    return bookings.filter((booking) => {
      const dateKey =
        getBookingDateKey(booking);

      return (
        dateKey >= range.start &&
        dateKey < range.end
      );
    });
  }, [bookings, month]);

  const syncOverview = useMemo(() => {
    const eventsById = new Map();
    const eventsByReference = new Map();

    calendarEvents.forEach((event) => {
      const eventId =
        normalizeEventId(event.eventId);
      const bookingReference =
        normalizeReference(
          event.bookingReference
        );

      if (eventId) {
        eventsById.set(eventId, event);
      }

      if (bookingReference) {
        eventsByReference.set(
          bookingReference,
          event
        );
      }
    });

    const matchedEventIds = new Set();
    const statusByBookingId = new Map();
    let synced = 0;
    let needsAttention = 0;

    monthBookings.forEach((booking) => {
      const calendarEventId =
        normalizeEventId(
          booking.calendar_event_id
        );
      const bookingReference =
        normalizeReference(
          booking.booking_reference
        );
      const eventById = calendarEventId
        ? eventsById.get(calendarEventId)
        : null;
      const eventByReference =
        bookingReference
          ? eventsByReference.get(
              bookingReference
            )
          : null;
      const event =
        eventById || eventByReference;

      let status;

      if (!event) {
        status = {
          code: "missing",
          label: "Google event missing",
        };
        needsAttention += 1;
      } else {
        matchedEventIds.add(
          normalizeEventId(event.eventId)
        );

        const bookingDateTime = `${getBookingDateKey(
          booking
        )}T${String(
          booking.shoot_time || ""
        ).slice(0, 5)}`;
        const googleDateTime =
          getManilaDateTimeKey(event.start);

        if (
          bookingDateTime !==
          googleDateTime
        ) {
          status = {
            code: "different",
            label: "Google time differs",
          };
          needsAttention += 1;
        } else if (!eventById) {
          status = {
            code: "reference",
            label: "Event found by reference",
          };
          needsAttention += 1;
        } else {
          status = {
            code: "synced",
            label: "Google synced",
          };
          synced += 1;
        }
      }

      statusByBookingId.set(
        booking.id,
        status
      );
    });

    const googleOnly = calendarEvents.filter(
      (event) =>
        !matchedEventIds.has(
          normalizeEventId(event.eventId)
        )
    ).length;

    return {
      synced,
      needsAttention,
      googleOnly,
      total: monthBookings.length,
      statusByBookingId,
    };
  }, [calendarEvents, monthBookings]);

  const refreshCalendar = () => {
    loadBookings();
    loadCalendarSync();
  };

  const showToday = () => {
    setMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );
    setSelectedDate(todayKey);
  };

  return (
    <div className="crm-calendar-page">
      <div className="crm-calendar-toolbar">
        <div className="crm-calendar-month-navigation">
          <button
            type="button"
            className="crm-calendar-icon-button"
            onClick={() =>
              setMonth(
                (current) =>
                  new Date(
                    current.getFullYear(),
                    current.getMonth() - 1,
                    1
                  )
              )
            }
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>

          <h2>
            {new Intl.DateTimeFormat(
              "en-PH",
              {
                month: "long",
                year: "numeric",
              }
            ).format(month)}
          </h2>

          <button
            type="button"
            className="crm-calendar-icon-button"
            onClick={() =>
              setMonth(
                (current) =>
                  new Date(
                    current.getFullYear(),
                    current.getMonth() + 1,
                    1
                  )
              )
            }
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="crm-calendar-toolbar-actions">
          <span className="crm-calendar-month-total">
            {monthBookingCount}{" "}
            {monthBookingCount === 1
              ? "booking"
              : "bookings"}
          </span>

          <button
            type="button"
            className="crm-calendar-secondary-button"
            onClick={showToday}
          >
            Today
          </button>

          <button
            type="button"
            className="crm-calendar-icon-button"
            onClick={refreshCalendar}
            disabled={
              isLoading || isCheckingSync
            }
            aria-label="Refresh calendar"
          >
            <RefreshCw
              size={17}
              className={
                isLoading || isCheckingSync
                  ? "is-spinning"
                  : ""
              }
            />
          </button>

          <button
            type="button"
            className="crm-calendar-primary-button"
            onClick={onCreateBooking}
          >
            <Plus size={17} />
            New Booking
          </button>
        </div>
      </div>

      {error && (
        <div className="crm-calendar-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadBookings}
          >
            Try again
          </button>
        </div>
      )}

      <div
        className={`crm-calendar-sync-status ${
          syncError
            ? "has-error"
            : syncOverview.needsAttention > 0
              ? "needs-attention"
              : "is-connected"
        }`}
      >
        <div className="crm-calendar-sync-icon">
          {syncError ? (
            <CloudOff size={19} />
          ) : syncOverview.needsAttention > 0 ? (
            <TriangleAlert size={19} />
          ) : (
            <CloudCheck size={19} />
          )}
        </div>

        <div className="crm-calendar-sync-copy">
          <strong>
            {syncError
              ? "Google Calendar check failed"
              : syncOverview.needsAttention > 0
                ? "Google Calendar needs attention"
                : "Google Calendar connected"}
          </strong>
          <span>
            {syncError
              ? syncError
              : `${syncOverview.synced} of ${syncOverview.total} CRM bookings synced · ${syncOverview.googleOnly} Google-only blocks`}
          </span>
        </div>

        <div className="crm-calendar-sync-actions">
          {lastSyncCheck && !syncError && (
            <span>
              Checked{" "}
              {new Intl.DateTimeFormat(
                "en-PH",
                {
                  hour: "numeric",
                  minute: "2-digit",
                }
              ).format(
                new Date(lastSyncCheck)
              )}
            </span>
          )}

          <button
            type="button"
            onClick={loadCalendarSync}
            disabled={isCheckingSync}
          >
            <RefreshCw
              size={14}
              className={
                isCheckingSync
                  ? "is-spinning"
                  : ""
              }
            />
            Check sync
          </button>
        </div>
      </div>

      <div className="crm-calendar-layout">
        <section
          className="crm-calendar-card"
          aria-label="Booking calendar"
        >
          <div className="crm-calendar-weekdays">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>
                {weekday}
              </span>
            ))}
          </div>

          <div className="crm-calendar-grid">
            {calendarDays.map((date) => {
              const dateKey = getDateKey(date);
              const dayBookings =
                bookingsByDate.get(dateKey) || [];
              const isOutsideMonth =
                date.getMonth() !==
                month.getMonth();
              const isToday =
                dateKey === todayKey;
              const isSelected =
                dateKey === selectedDate;

              return (
                <button
                  type="button"
                  className={[
                    "crm-calendar-day",
                    isOutsideMonth
                      ? "is-outside"
                      : "",
                    isToday ? "is-today" : "",
                    isSelected
                      ? "is-selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={dateKey}
                  onClick={() =>
                    setSelectedDate(dateKey)
                  }
                  aria-label={`${formatSelectedDate(
                    dateKey
                  )}, ${dayBookings.length} bookings`}
                >
                  <span className="crm-calendar-day-number">
                    {date.getDate()}
                  </span>

                  <span className="crm-calendar-events">
                    {dayBookings
                      .slice(0, 3)
                      .map((booking) => (
                        <span
                          className={`crm-calendar-event is-${getPaymentTone(
                            booking.payment_status
                          )}`}
                          key={booking.id}
                        >
                          <span>
                            {formatTime(
                              booking.shoot_time
                            )}
                          </span>
                          <strong>
                            {booking.client_name ||
                              "Unnamed client"}
                          </strong>
                        </span>
                      ))}

                    {dayBookings.length > 3 && (
                      <span className="crm-calendar-more">
                        +{dayBookings.length - 3} more
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="crm-calendar-agenda">
          <div className="crm-calendar-agenda-heading">
            <div>
              <p>Selected day</p>
              <h3>
                {formatSelectedDate(
                  selectedDate
                )}
              </h3>
            </div>

            <span>
              {selectedBookings.length}
            </span>
          </div>

          {selectedBookings.length === 0 ? (
            <div className="crm-calendar-empty">
              <CalendarDays
                size={24}
                strokeWidth={1.5}
              />
              <strong>No bookings</strong>
              <p>
                This day is currently available.
              </p>
              <button
                type="button"
                onClick={onCreateBooking}
              >
                <Plus size={15} />
                Add booking
              </button>
            </div>
          ) : (
            <div className="crm-calendar-agenda-list">
              {selectedBookings.map(
                (booking) => (
                  <article
                    className="crm-calendar-agenda-item"
                    key={booking.id}
                  >
                    <div className="crm-calendar-agenda-time">
                      <Clock3 size={14} />
                      {formatTime(
                        booking.shoot_time
                      )}
                    </div>

                    <strong>
                      {booking.client_name ||
                        "Unnamed client"}
                    </strong>
                    <span>
                      {booking.package_title ||
                        "Package not set"}
                    </span>

                    <div className="crm-calendar-agenda-meta">
                      <span
                        className={`is-${getPaymentTone(
                          booking.payment_status
                        )}`}
                      >
                        {getPaymentLabel(
                          booking.payment_status
                        )}
                      </span>
                      <span>
                        {booking.booking_status ||
                          "Confirmed"}
                      </span>
                      {syncOverview.statusByBookingId.get(
                        booking.id
                      ) && (
                        <span
                          className={`is-sync-${syncOverview.statusByBookingId.get(
                            booking.id
                          ).code}`}
                        >
                          {
                            syncOverview.statusByBookingId.get(
                              booking.id
                            ).label
                          }
                        </span>
                      )}
                    </div>
                  </article>
                )
              )}

              <button
                type="button"
                className="crm-calendar-view-bookings"
                onClick={() =>
                  onNavigate("Bookings")
                }
              >
                Open all bookings
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default CalendarTab;
