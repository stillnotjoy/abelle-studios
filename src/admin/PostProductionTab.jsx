import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderPlus,
  LoaderCircle,
  RotateCcw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import { getSavedAdminPin } from "./adminConfig";

import "./PostProductionCRM.css";

const STATUS_DETAILS = {
  FOR_EDITING: {
    label: "For Editing",
    className: "is-editing",
  },
  READY_FOR_DELIVERY: {
    label: "Ready for Delivery",
    className: "is-ready",
  },
  DELIVERED: {
    label: "Delivered",
    className: "is-delivered",
  },
};

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

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(`${value}T00:00:00+08:00`)
  );
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

function getInitials(name) {
  const parts = String(name || "Client")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPostProductionStatus(booking) {
  const status = String(
    booking.post_production_status || ""
  ).toUpperCase();

  return STATUS_DETAILS[status]
    ? status
    : "FOR_EDITING";
}

function getDeadlineState(dueDate, status) {
  if (
    !dueDate ||
    status !== "FOR_EDITING"
  ) {
    return "";
  }

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(
      2,
      "0"
    ),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (dueDate < localToday) {
    return "is-overdue";
  }

  if (dueDate === localToday) {
    return "is-due-today";
  }

  return "";
}

function PostProductionTab() {
  const [bookings, setBookings] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ACTIVE");

  const [workingBookingId, setWorkingBookingId] =
    useState(null);

  const [dueDateDrafts, setDueDateDrafts] =
    useState({});

  const adminPin = getSavedAdminPin();

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
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
            "Could not load the editing queue."
        );
      }

      const nextBookings = Array.isArray(
        data.bookings
      )
        ? data.bookings
        : [];

      setBookings(nextBookings);

      setDueDateDrafts(
        Object.fromEntries(
          nextBookings.map((booking) => [
            booking.id,
            booking.editing_due_date || "",
          ])
        )
      );
    } catch (loadError) {
      console.error(
        "Editing queue load failed:",
        loadError
      );

      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [adminPin]);

  useEffect(() => {
    const loadTimer = window.setTimeout(
      loadBookings,
      0
    );

    return () =>
      window.clearTimeout(loadTimer);
  }, [loadBookings]);

  const queueBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.shoot_status ===
            "COMPLETED" ||
          STATUS_DETAILS[
            booking.post_production_status
          ]
      ),
    [bookings]
  );

  const stats = useMemo(() => {
    const editing = queueBookings.filter(
      (booking) =>
        getPostProductionStatus(booking) ===
        "FOR_EDITING"
    ).length;

    const ready = queueBookings.filter(
      (booking) =>
        getPostProductionStatus(booking) ===
        "READY_FOR_DELIVERY"
    ).length;

    const delivered = queueBookings.filter(
      (booking) =>
        getPostProductionStatus(booking) ===
        "DELIVERED"
    ).length;

    const overdue = queueBookings.filter(
      (booking) =>
        getDeadlineState(
          booking.editing_due_date,
          getPostProductionStatus(booking)
        ) === "is-overdue"
    ).length;

    return {
      editing,
      ready,
      delivered,
      overdue,
    };
  }, [queueBookings]);

  const visibleBookings = useMemo(() => {
    const cleanSearch = searchTerm
      .trim()
      .toLowerCase();

    return queueBookings.filter(
      (booking) => {
        const status =
          getPostProductionStatus(booking);

        const matchesFilter =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" &&
            status !== "DELIVERED") ||
          status === statusFilter;

        const searchableText = [
          booking.client_name,
          booking.booking_reference,
          booking.package_title,
          booking.email,
          booking.phone,
        ]
          .join(" ")
          .toLowerCase();

        return (
          matchesFilter &&
          (!cleanSearch ||
            searchableText.includes(
              cleanSearch
            ))
        );
      }
    );
  }, [
    queueBookings,
    searchTerm,
    statusFilter,
  ]);

  const replaceBooking = (updatedBooking) => {
    setBookings((current) =>
      current.map((booking) =>
        booking.id === updatedBooking.id
          ? updatedBooking
          : booking
      )
    );

    setDueDateDrafts((current) => ({
      ...current,
      [updatedBooking.id]:
        updatedBooking.editing_due_date ||
        "",
    }));
  };

  const updatePostProduction =
    async (
      booking,
      nextStatus,
      confirmationMessage
    ) => {
      if (
        confirmationMessage &&
        !window.confirm(confirmationMessage)
      ) {
        return;
      }

      try {
        setWorkingBookingId(booking.id);

        const response = await fetch(
          "/api/admin-manual-bookings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-admin-pin": adminPin,
            },
            body: JSON.stringify({
              action:
                "update_post_production",
              id: booking.id,
              status: nextStatus,
              editing_due_date:
                dueDateDrafts[booking.id] ||
                "",
            }),
          }
        );

        const data =
          await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not update this booking."
          );
        }

        if (data.booking) {
          replaceBooking(data.booking);
        } else {
          await loadBookings();
        }

        alert(
          data.message ||
            "Post-production updated."
        );
      } catch (updateError) {
        console.error(
          "Post-production update failed:",
          updateError
        );

        alert(updateError.message);
      } finally {
        setWorkingBookingId(null);
      }
    };

  const createClientFolder =
    async (booking) => {
      if (booking.client_drive_folder_url) {
        window.open(
          booking.client_drive_folder_url,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }

      try {
        setWorkingBookingId(booking.id);

        const response = await fetch(
          "/api/admin-manual-bookings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-admin-pin": adminPin,
            },
            body: JSON.stringify({
              action:
                "create_client_drive_folder",
              id: booking.id,
            }),
          }
        );

        const data =
          await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not create the client folder."
          );
        }

        if (data.booking) {
          replaceBooking(data.booking);
        }

        const folderUrl =
          data.driveFolder?.folderUrl ||
          data.booking
            ?.client_drive_folder_url;

        if (folderUrl) {
          window.open(
            folderUrl,
            "_blank",
            "noopener,noreferrer"
          );
        }
      } catch (folderError) {
        console.error(
          "Client folder action failed:",
          folderError
        );

        alert(folderError.message);
      } finally {
        setWorkingBookingId(null);
      }
    };

  return (
    <section className="crm-production-page">
      <div className="crm-production-overview">
        <article className="crm-production-stat is-editing">
          <span className="crm-production-stat-icon">
            <Sparkles size={19} />
          </span>

          <div>
            <span>For Editing</span>
            <strong>{stats.editing}</strong>
          </div>
        </article>

        <article className="crm-production-stat is-ready">
          <span className="crm-production-stat-icon">
            <CheckCircle2 size={19} />
          </span>

          <div>
            <span>Ready for Delivery</span>
            <strong>{stats.ready}</strong>
          </div>
        </article>

        <article className="crm-production-stat is-delivered">
          <span className="crm-production-stat-icon">
            <Send size={19} />
          </span>

          <div>
            <span>Delivered</span>
            <strong>{stats.delivered}</strong>
          </div>
        </article>

        <article className="crm-production-stat is-overdue">
          <span className="crm-production-stat-icon">
            <Clock3 size={19} />
          </span>

          <div>
            <span>Overdue</span>
            <strong>{stats.overdue}</strong>
          </div>
        </article>
      </div>

      <div className="crm-production-shell">
        <div className="crm-production-toolbar">
          <label className="crm-production-search">
            <Search size={16} />

            <input
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search client, package or reference..."
            />
          </label>

          <select
            className="crm-production-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="ACTIVE">
              Active work
            </option>
            <option value="FOR_EDITING">
              For Editing
            </option>
            <option value="READY_FOR_DELIVERY">
              Ready for Delivery
            </option>
            <option value="DELIVERED">
              Delivered
            </option>
            <option value="ALL">
              All post-production
            </option>
          </select>
        </div>

        <div className="crm-production-heading">
          <div>
            <h2>Post-production Queue</h2>
            <p>
              Track editing, client files and final delivery.
            </p>
          </div>

          <span>
            Showing {visibleBookings.length} of{" "}
            {queueBookings.length}
          </span>
        </div>

        {isLoading ? (
          <div className="crm-production-empty">
            <LoaderCircle
              size={26}
              className="crm-production-spinner"
            />
            <p>Loading editing queue...</p>
          </div>
        ) : error ? (
          <div className="crm-production-empty is-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={loadBookings}
            >
              Try again
            </button>
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="crm-production-empty">
            <CheckCircle2 size={28} />
            <h3>No work in this view</h3>
            <p>
              Completed shoots appear here automatically after you mark them complete.
            </p>
          </div>
        ) : (
          <div className="crm-production-list">
            {visibleBookings.map(
              (booking) => {
                const status =
                  getPostProductionStatus(
                    booking
                  );

                const statusDetails =
                  STATUS_DETAILS[status];

                const deadlineState =
                  getDeadlineState(
                    booking.editing_due_date,
                    status
                  );

                const isWorking =
                  workingBookingId ===
                  booking.id;

                const draftDueDate =
                  dueDateDrafts[booking.id] ||
                  "";

                const deadlineChanged =
                  draftDueDate !==
                  (booking.editing_due_date ||
                    "");

                return (
                  <article
                    className="crm-production-card"
                    key={booking.id}
                  >
                    <div className="crm-production-client">
                      <span className="crm-production-avatar">
                        {getInitials(
                          booking.client_name
                        )}
                      </span>

                      <div>
                        <strong>
                          {booking.client_name}
                        </strong>
                        <span>
                          {
                            booking.booking_reference
                          }
                        </span>
                        <span>
                          {booking.package_title}
                        </span>
                      </div>
                    </div>

                    <div className="crm-production-info">
                      <span className="crm-production-label">
                        Shoot
                      </span>
                      <strong>
                        {formatDate(
                          booking.shoot_date
                        )}
                      </strong>
                      <span>
                        Completed{" "}
                        {formatDateTime(
                          booking.shoot_completed_at
                        ) || "—"}
                      </span>
                    </div>

                    <div className="crm-production-deadline">
                      <span className="crm-production-label">
                        Editing Deadline
                      </span>

                      {status === "DELIVERED" ? (
                        <strong>
                          {formatDate(
                            booking.editing_due_date
                          )}
                        </strong>
                      ) : (
                        <div className="crm-production-date-control">
                          <input
                            type="date"
                            value={draftDueDate}
                            onChange={(event) =>
                              setDueDateDrafts(
                                (current) => ({
                                  ...current,
                                  [booking.id]:
                                    event.target
                                      .value,
                                })
                              )
                            }
                            disabled={isWorking}
                            aria-label={`Editing deadline for ${booking.client_name}`}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updatePostProduction(
                                booking,
                                status
                              )
                            }
                            disabled={
                              isWorking ||
                              !deadlineChanged
                            }
                          >
                            Save
                          </button>
                        </div>
                      )}

                      {deadlineState && (
                        <span
                          className={`crm-production-deadline-state ${deadlineState}`}
                        >
                          {deadlineState ===
                          "is-overdue"
                            ? "Overdue"
                            : "Due today"}
                        </span>
                      )}
                    </div>

                    <div className="crm-production-files">
                      <span className="crm-production-label">
                        Client Files
                      </span>

                      <button
                        type="button"
                        className="crm-production-folder-button"
                        onClick={() =>
                          createClientFolder(
                            booking
                          )
                        }
                        disabled={isWorking}
                      >
                        {booking.client_drive_folder_url ? (
                          <>
                            <ExternalLink
                              size={14}
                            />
                            Open Folder
                          </>
                        ) : (
                          <>
                            <FolderPlus
                              size={14}
                            />
                            Create Folder
                          </>
                        )}
                      </button>

                      <span>
                        {booking.client_drive_folder_url
                          ? "Drive folder connected"
                          : "Folder required before delivery"}
                      </span>
                    </div>

                    <div className="crm-production-next-step">
                      <span
                        className={`crm-production-status ${statusDetails.className}`}
                      >
                        <CheckCircle2 size={13} />
                        {statusDetails.label}
                      </span>

                      {status ===
                        "FOR_EDITING" && (
                        <button
                          type="button"
                          className="crm-production-primary-action"
                          onClick={() =>
                            updatePostProduction(
                              booking,
                              "READY_FOR_DELIVERY",
                              `Mark the files for "${booking.client_name}" as ready for delivery?`
                            )
                          }
                          disabled={isWorking}
                        >
                          <CheckCircle2
                            size={14}
                          />
                          {isWorking
                            ? "Updating..."
                            : "Mark Ready"}
                        </button>
                      )}

                      {status ===
                        "READY_FOR_DELIVERY" && (
                        <div className="crm-production-stage-actions">
                          <button
                            type="button"
                            className="crm-production-primary-action"
                            onClick={() =>
                              updatePostProduction(
                                booking,
                                "DELIVERED",
                                `Confirm that the final files for "${booking.client_name}" were delivered to the client?`
                              )
                            }
                            disabled={isWorking}
                          >
                            <Send size={14} />
                            {isWorking
                              ? "Updating..."
                              : "Mark Delivered"}
                          </button>

                          <button
                            type="button"
                            className="crm-production-secondary-action"
                            onClick={() =>
                              updatePostProduction(
                                booking,
                                "FOR_EDITING",
                                `Return "${booking.client_name}" to the editing queue?`
                              )
                            }
                            disabled={isWorking}
                            title="Return to editing"
                            aria-label="Return to editing"
                          >
                            <RotateCcw
                              size={14}
                            />
                          </button>
                        </div>
                      )}

                      {status === "DELIVERED" && (
                        <span className="crm-production-completed-at">
                          Delivered{" "}
                          {formatDateTime(
                            booking.delivered_at
                          ) || "—"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default PostProductionTab;
