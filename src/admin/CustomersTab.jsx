import {
  CalendarDays,
  ChevronRight,
  Mail,
MessageSquareText,
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
const [isLoadingConversations, setIsLoadingConversations] = useState(false);
const [conversationError, setConversationError] = useState("");
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
  if (!customer?.phone) {
    setConversationMessages([]);
    setConversationError("");
    return;
  }

  try {
    setIsLoadingConversations(true);
    setConversationError("");

    const params = new URLSearchParams({
      phone: customer.phone,
    });

    const response = await adminFetch(
      `/api/admin-customer-conversations?${params.toString()}`
    );

    const result = await readJson(response);

    if (!response.ok) {
      throw new Error(
        result.error || "Could not load SMS conversation history."
      );
    }

    setConversationMessages(result.messages || []);
  } catch (loadError) {
    console.error("Conversation loading failed:", loadError);
    setConversationMessages([]);
    setConversationError(loadError.message);
  } finally {
    setIsLoadingConversations(false);
  }
}, []);

  useEffect(() => {
    const timer = window.setTimeout(loadCustomers, 0);
    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

useEffect(() => {
  if (!selectedCustomer) {
    setConversationMessages([]);
    setConversationError("");
    return;
  }

  loadConversations(selectedCustomer);
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
          <div className="crm-customers-empty">Loading customer records...</div>
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
                    onClick={() => setSelectedCustomer(customer)}
                    tabIndex="0"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCustomer(customer);
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

      {selectedCustomer && (
        <div
          className="crm-customer-drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCustomer(null);
            }
          }}
        >
          <aside className="crm-customer-drawer" aria-label="Customer profile">
            <div className="crm-customer-drawer-header">
              <div>
                <p>Customer Profile</p>
                <h2>{selectedCustomer.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsEditingCustomer(false);
                  setCustomerEditError("");
                }}
                aria-label="Close customer profile"
              >
                <X size={20} />
              </button>
            </div>

            {!isEditingCustomer ? (
              <div className="crm-customer-profile-contact-wrap">
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
              </div>
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
                  Keep at least one mobile number or email address. This updates the customer's matching CRM booking records.
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
                    {isSavingCustomer
                      ? "Saving..."
                      : "Save Customer"}
                  </button>
                </div>
              </form>
            )}

            <div className="crm-customer-profile-stats">
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
<div className="crm-customer-conversations">
  <div className="crm-customer-history-heading">
    <MessageSquareText size={18} />
    <h3>Conversations</h3>
  </div>

  {!selectedCustomer.phone && (
    <div className="crm-customer-conversation-empty">
      No mobile number saved for this customer.
    </div>
  )}

  {selectedCustomer.phone && isLoadingConversations && (
    <div className="crm-customer-conversation-empty">
      Loading SMS history...
    </div>
  )}

  {selectedCustomer.phone && conversationError && (
    <div className="crm-customer-conversation-error">
      {conversationError}
    </div>
  )}

  {selectedCustomer.phone &&
    !isLoadingConversations &&
    !conversationError &&
    conversationMessages.length === 0 && (
      <div className="crm-customer-conversation-empty">
        No SMS history found for this mobile number yet.
      </div>
    )}

  {conversationMessages.length > 0 && (
    <div className="crm-customer-message-list">
      {conversationMessages.map((message) => (
        <article
          key={message.id || `${message.date}-${message.text}`}
          className={`crm-customer-message ${
            message.direction === "inbound" ? "is-inbound" : "is-outbound"
          }`}
        >
          <div>
            <strong>
              {message.direction === "inbound" ? "Customer" : "Abelle Studios"}
            </strong>
            <span>{formatConversationDate(message.date)}</span>
          </div>

          <p>{message.text || "No message text available."}</p>

          <footer>
            <span>{cleanLabel(message.direction || "outbound")}</span>
            <span>{cleanLabel(message.status || "unknown")}</span>
          </footer>
        </article>
      ))}
    </div>
  )}
</div>
            <div className="crm-customer-history">
              <div className="crm-customer-history-heading">
                <CalendarDays size={18} />
                <h3>Booking History</h3>
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
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default CustomersTab;
