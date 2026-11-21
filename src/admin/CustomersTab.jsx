import {
  ArrowLeft,
  ChevronRight,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { adminFetch } from "./adminApi";
import "./CustomersCRM.css";

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
  }).format(new Date(`${value}T12:00:00+08:00`));
}

function cleanLabel(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatConversationDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

async function readJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function CustomerSummaryCard({ icon: Icon, label, value, detail, tone }) {
  return (
    <article className={`crm-customer-summary-card ${tone || ""}`}>
      <span className="crm-customer-summary-icon">
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

function CustomersTab() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [conversationMessages, setConversationMessages] = useState([]);
  const [customerActivities, setCustomerActivities] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const [conversationWarning, setConversationWarning] = useState("");
  const conversationRequest = useRef(0);

  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerEditError, setCustomerEditError] = useState("");
  const [customerEditForm, setCustomerEditForm] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await adminFetch(
        "/api/admin-manual-bookings?view=customers"
      );

      const nextData = await readJson(response);

      if (!response.ok) {
        throw new Error(
          nextData.error || "Could not load customer records."
        );
      }

      setData(nextData);

      setSelectedCustomer((current) => {
        if (!current) {
          return null;
        }

        const currentBookingIds = new Set(
          current.bookings.map((booking) => booking.id)
        );

        return (
          nextData.customers.find(
            (customer) => customer.id === current.id
          ) ||
          nextData.customers.find((customer) =>
            customer.bookings.some((booking) =>
              currentBookingIds.has(booking.id)
            )
          ) ||
          null
        );
      });
    } catch (loadError) {
      console.error("Customer loading failed:", loadError);
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async (customer) => {
    const requestId = ++conversationRequest.current;
    if (!customer?.phone && !customer?.email) {
      setConversationMessages([]);
      setCustomerActivities([]);
      setConversationError("");
      setConversationWarning("");
      setIsLoadingConversations(false);
      return;
    }

    try {
      setIsLoadingConversations(true);
      setConversationError("");
      setConversationWarning("");
      setConversationMessages([]);
      setCustomerActivities([]);

     const params = new URLSearchParams();

if (customer.phone) {
  params.set("phone", customer.phone);
}

if (customer.email) {
  params.set("email", customer.email);
}

const bookingDates = (customer.bookings || [])
  .map((booking) => booking.shootDate)
  .filter(Boolean)
  .sort();

if (bookingDates.length > 0) {
  const firstBookingDate = new Date(`${bookingDates[0]}T12:00:00+08:00`);
  const lastBookingDate = new Date(
    `${bookingDates[bookingDates.length - 1]}T12:00:00+08:00`
  );

  firstBookingDate.setDate(firstBookingDate.getDate() - 7);
  lastBookingDate.setDate(lastBookingDate.getDate() + 14);

  params.set("start_date", firstBookingDate.toISOString().slice(0, 10));
  params.set("end_date", lastBookingDate.toISOString().slice(0, 10));
}

      const response = await adminFetch(
        `/api/admin-customer-conversations?${params.toString()}`
      );

      const result = await readJson(response);
      if (requestId !== conversationRequest.current) return;

      if (!response.ok) {
        throw new Error(
          result.error || "Could not load customer conversation history."
        );
      }

      setConversationMessages(result.messages || []);
      setConversationWarning(result.warning || "");
      setCustomerActivities(result.activities || []);
    } catch (loadError) {
      if (requestId !== conversationRequest.current) return;
      console.error("Conversation loading failed:", loadError);
      setConversationMessages([]);
      setCustomerActivities([]);
      setConversationError(loadError.message);
    } finally {
      if (requestId === conversationRequest.current) {
        setIsLoadingConversations(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadCustomers, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadConversations(selectedCustomer), 0);
    return () => {
      window.clearTimeout(timer);
      conversationRequest.current += 1;
    };
  }, [loadConversations, selectedCustomer]);

  const customers = useMemo(
    () => data?.customers || [],
    [data]
  );

  const summary = data?.summary || {};

  const visibleCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      if (filter === "REPEAT" && customer.bookingCount < 2) {
        return false;
      }

      if (filter === "OUTSTANDING" && customer.outstandingBalance <= 0) {
        return false;
      }

      if (filter === "MOBILE" && !customer.phone) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        customer.name,
        customer.email,
        customer.phone,
        customer.latestPackage,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [customers, filter, search]);

  const openCustomer = (customer) => {
    conversationRequest.current += 1;
    setConversationMessages([]);
    setCustomerActivities([]);
    setConversationError("");
    setConversationWarning("");
    setSelectedCustomer(customer);
    setIsEditingCustomer(false);
    setCustomerEditError("");
  };

  const closeCustomer = () => {
    conversationRequest.current += 1;
    setSelectedCustomer(null);
    setIsEditingCustomer(false);
    setCustomerEditError("");
  };

  const startEditingCustomer = () => {
    setCustomerEditForm({
      name: selectedCustomer.name || "",
      phone: selectedCustomer.phone || "",
      email: selectedCustomer.email || "",
    });

    setCustomerEditError("");
    setIsEditingCustomer(true);
  };

  const cancelEditingCustomer = () => {
    setCustomerEditError("");
    setIsEditingCustomer(false);
  };

  const saveCustomer = async (event) => {
    event.preventDefault();

    try {
      setIsSavingCustomer(true);
      setCustomerEditError("");

      const response = await adminFetch(
        "/api/admin-manual-bookings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "update_customer",
            customerId: selectedCustomer.id,
            name: customerEditForm.name,
            phone: customerEditForm.phone,
            email: customerEditForm.email,
          }),
        }
      );

      const result = await readJson(response);

      if (!response.ok) {
        throw new Error(
          result.error || "Customer information could not be updated."
        );
      }

      setSelectedCustomer(result.customer);
      setIsEditingCustomer(false);
      await loadCustomers();
    } catch (saveError) {
      console.error("Customer update failed:", saveError);
      setCustomerEditError(saveError.message);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  if (selectedCustomer) {
    return (
      <section className="crm-customers-page">
        <div className="crm-customer-profile-view is-compact">
          <div className="crm-customer-profile-topbar">
            <button
              type="button"
              className="crm-customer-back-button"
              onClick={closeCustomer}
            >
              <ArrowLeft size={17} />
              Back to Customers
            </button>

            <button
              type="button"
              className="crm-customer-close-button"
              onClick={closeCustomer}
              aria-label="Close customer profile"
            >
              <X size={18} />
            </button>
          </div>

          <div className="crm-customer-crm-layout">
            <aside className="crm-customer-profile-sidebar">
              <div className="crm-customer-avatar-large">
                {selectedCustomer.name.slice(0, 1).toUpperCase()}
              </div>

              <div className="crm-customer-profile-title">
                <p>Customer Profile</p>
                <h2>{selectedCustomer.name}</h2>
                <span>{selectedCustomer.latestPackage || "No latest package"}</span>
              </div>

              {!isEditingCustomer ? (
                <>
                  <div className="crm-customer-profile-contact">
                    <div>
                      <Phone size={16} />
                      <span>{selectedCustomer.phone || "No mobile number"}</span>
                    </div>

                    <div>
                      <Mail size={16} />
                      <span>{selectedCustomer.email || "No email address"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="crm-customer-edit-button"
                    onClick={startEditingCustomer}
                  >
                    <Pencil size={15} />
                    Edit Customer
                  </button>
                </>
              ) : (
                <form
                  className="crm-customer-edit-form"
                  onSubmit={saveCustomer}
                >
                  <label>
                    Customer Name
                    <input
                      type="text"
                      value={customerEditForm.name}
                      onChange={(event) =>
                        setCustomerEditForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      maxLength="120"
                      required
                    />
                  </label>

                  <label>
                    Mobile Number
                    <input
                      type="tel"
                      value={customerEditForm.phone}
                      onChange={(event) =>
                        setCustomerEditForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      maxLength="40"
                    />
                  </label>

                  <label>
                    Email Address
                    <input
                      type="email"
                      value={customerEditForm.email}
                      onChange={(event) =>
                        setCustomerEditForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      maxLength="254"
                    />
                  </label>

                  <p>
                    Keep at least one mobile number or email address. This updates
                    the customer's matching CRM booking records.
                  </p>

                  {customerEditError && (
                    <div className="crm-customer-edit-error">
                      {customerEditError}
                    </div>
                  )}

                  <div className="crm-customer-edit-actions">
                    <button
                      type="button"
                      onClick={cancelEditingCustomer}
                      disabled={isSavingCustomer}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingCustomer}
                    >
                      {isSavingCustomer ? "Saving..." : "Save Customer"}
                    </button>
                  </div>
                </form>
              )}

              <div className="crm-customer-profile-stats stacked">
                <div>
                  <span>Bookings</span>
                  <strong>{selectedCustomer.bookingCount}</strong>
                </div>

                <div>
                  <span>Total Spent</span>
                  <strong>{money(selectedCustomer.totalSpent)}</strong>
                </div>

                <div>
                  <span>Outstanding</span>
                  <strong>{money(selectedCustomer.outstandingBalance)}</strong>
                </div>
              </div>
            </aside>

            <main className="crm-customer-conversation-column">
              <div className="crm-customer-section-header">
                <div>
                  <p>Client Communication</p>
                  <h2>Conversations</h2>
                </div>

                <button
                  type="button"
                  className="crm-customers-refresh"
                  onClick={() => loadConversations(selectedCustomer)}
                  disabled={isLoadingConversations}
                >
                  <RefreshCw
                    size={16}
                    className={isLoadingConversations ? "is-spinning" : ""}
                  />
                  Refresh
                </button>
              </div>

              {!selectedCustomer.phone && !selectedCustomer.email && (
                <div className="crm-customer-conversation-empty">
                  No mobile number or email saved for this customer.
                </div>
              )}

              {(selectedCustomer.phone || selectedCustomer.email) &&
                isLoadingConversations && (
                  <div className="crm-customer-conversation-empty">
                    Loading customer conversations...
                  </div>
                )}

              {(selectedCustomer.phone || selectedCustomer.email) &&
                conversationError && (
                  <div className="crm-customer-conversation-error">
                    {conversationError}
                  </div>
                )}

              {conversationWarning && (
                <div className="crm-customer-conversation-error" role="status">
                  {conversationWarning}
                </div>
              )}

              {(selectedCustomer.phone || selectedCustomer.email) &&
                !isLoadingConversations &&
                !conversationError &&
                conversationMessages.length === 0 && (
                  <div className="crm-customer-conversation-empty">
                    No conversations found for this customer yet.
                  </div>
                )}

              {conversationMessages.length > 0 && (
                <div className="crm-customer-message-list">
                  {conversationMessages.map((message) => (
                    <details
                      key={message.id || `${message.date}-${message.text}`}
                      className={`crm-customer-message ${
                        message.direction === "inbound"
                          ? "is-inbound"
                          : "is-outbound"
                      }`}
                    >
                      <summary className="crm-customer-message-summary">
                        <span className="crm-customer-message-heading">
                          <span className="crm-customer-message-channel">{cleanLabel(message.type || "sms")}</span>
                          <strong>{message.subject || String(message.text || "SMS message").replace(/\s+/g, " ").slice(0, 100)}</strong>
                          <span className="crm-customer-message-date">{formatConversationDate(message.date)}</span>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" />
                      </summary>
                      <div className="crm-customer-message-content">
                      <p>{message.text || "No message text available."}</p>

                      <footer>
                        <span>{cleanLabel(message.type || "sms")}</span>
                        <span>{cleanLabel(message.direction || "outbound")}</span>
                        <span>{cleanLabel(message.status || "unknown")}</span>
                      </footer>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </main>

            <aside className="crm-customer-side-column">
              <section className="crm-customer-history crm-customer-activity-history nested">
                <div className="crm-customer-section-header small">
                  <div>
                    <p>Internal Timeline</p>
                    <h2>Activity</h2>
                  </div>
                </div>

                {isLoadingConversations && (
                  <div className="crm-customer-conversation-empty">
                    Loading activity history...
                  </div>
                )}

                {!isLoadingConversations && customerActivities.length === 0 && (
                  <div className="crm-customer-conversation-empty">
                    No activity logs found for this customer yet.
                  </div>
                )}

                {customerActivities.map((activity) => (
                  <article
                    key={activity.id || `${activity.date}-${activity.title}`}
                  >
                    <div>
                      <strong>{activity.title || cleanLabel(activity.type)}</strong>
                      <span>{formatConversationDate(activity.date)}</span>
                    </div>

                    {activity.description && <p>{activity.description}</p>}

                    <footer>
                      <span>{cleanLabel(activity.type)}</span>
                      {activity.bookingReference && (
                        <span>{activity.bookingReference}</span>
                      )}
                      {activity.createdBy && (
                        <span>{cleanLabel(activity.createdBy)}</span>
                      )}
                    </footer>
                  </article>
                ))}
              </section>

              <section className="crm-customer-history nested">
                <div className="crm-customer-section-header small">
                  <div>
                    <p>Client Bookings</p>
                    <h2>Bookings</h2>
                  </div>
                </div>

                {selectedCustomer.bookings.map((booking) => (
                  <article key={booking.id}>
                    <div>
                      <strong>{booking.packageTitle}</strong>
                      <span>{booking.bookingReference}</span>
                    </div>

                    <div>
                      <b>{formatDate(booking.shootDate)}</b>
                      <span>{cleanLabel(booking.paymentStatus)}</span>
                    </div>

                    <footer>
                      <span>Paid {money(booking.amountPaid)}</span>
                      <span>{cleanLabel(booking.bookingSource)}</span>
                    </footer>
                  </article>
                ))}
              </section>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="crm-customers-page">
      <div className="crm-customer-summary-grid">
        <CustomerSummaryCard
          icon={Users}
          label="Total Customers"
          value={summary.totalCustomers || 0}
          detail="Combined from existing bookings"
        />

        <CustomerSummaryCard
          icon={UserRoundCheck}
          label="Repeat Customers"
          value={summary.repeatCustomers || 0}
          detail="Customers with two or more bookings"
          tone="is-gold"
        />

        <CustomerSummaryCard
          icon={Phone}
          label="Mobile Contacts"
          value={summary.customersWithMobile || 0}
          detail="Available for future consent-based SMS"
          tone="is-green"
        />

        <CustomerSummaryCard
          icon={WalletCards}
          label="Customer Value"
          value={money(summary.totalCustomerValue)}
          detail="Payments recorded across all customers"
          tone="is-amber"
        />
      </div>

      <div className="crm-customers-shell">
        <div className="crm-customers-toolbar">
          <label className="crm-customers-search">
            <Search size={17} strokeWidth={1.8} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, email, or package..."
            />
          </label>

          <select
            className="crm-customers-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter customers"
          >
            <option value="ALL">All customers</option>
            <option value="REPEAT">Repeat customers</option>
            <option value="MOBILE">With mobile number</option>
            <option value="OUTSTANDING">With outstanding balance</option>
          </select>

          <button
            type="button"
            className="crm-customers-refresh"
            onClick={loadCustomers}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "is-spinning" : ""} />
            Refresh
          </button>
        </div>

        <div className="crm-customers-heading">
          <div>
            <h2>Customer Directory</h2>
            <p>One profile per matching phone number or email address.</p>
          </div>

          <span>
            Showing {visibleCustomers.length} of {customers.length}
          </span>
        </div>

        {error && (
          <div className="crm-customers-error">
            <strong>Customer records could not be loaded.</strong>
            <span>{error}</span>
          </div>
        )}

        {!error && isLoading && !data && (
          <div className="crm-customers-empty">
            Loading customer records...
          </div>
        )}

        {!error && !isLoading && visibleCustomers.length === 0 && (
          <div className="crm-customers-empty">
            No customers match the current search and filter.
          </div>
        )}

        {!error && visibleCustomers.length > 0 && (
          <div className="crm-customers-table-wrap">
            <table className="crm-customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Bookings</th>
                  <th>Total Spent</th>
                  <th>Last Session</th>
                  <th aria-label="View details" />
                </tr>
              </thead>

              <tbody>
                {visibleCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => openCustomer(customer)}
                    tabIndex="0"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openCustomer(customer);
                      }
                    }}
                  >
                    <td>
                      <div className="crm-customer-name-cell">
                        <span>{customer.name.slice(0, 1).toUpperCase()}</span>

                        <div>
                          <strong>{customer.name}</strong>
                          <small>{customer.latestPackage || "No package"}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="crm-customer-contact-cell">
                        <span>{customer.phone || "No mobile number"}</span>
                        <small>{customer.email || "No email address"}</small>
                      </div>
                    </td>

                    <td>
                      <strong>{customer.bookingCount}</strong>
                      <small>{customer.upcomingCount} upcoming</small>
                    </td>

                    <td>
                      <strong>{money(customer.totalSpent)}</strong>

                      {customer.outstandingBalance > 0 && (
                        <small className="is-outstanding">
                          {money(customer.outstandingBalance)} outstanding
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>{formatDate(customer.lastBookingDate)}</strong>
                      <small>Since {formatDate(customer.firstBookingDate)}</small>
                    </td>

                    <td>
                      <ChevronRight size={18} strokeWidth={1.8} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default CustomersTab;
