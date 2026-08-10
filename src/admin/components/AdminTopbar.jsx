import {
  Bell,
  CalendarDays,
  Menu,
  Search,
} from "lucide-react";

function AdminTopbar({
  onMobileMenuToggle,
}) {
  return (
    <header className="crm-topbar">
      <button
        type="button"
        className="crm-mobile-menu-button"
        onClick={onMobileMenuToggle}
        aria-label="Open navigation"
      >
        <Menu size={21} strokeWidth={1.8} />
      </button>

      <div className="crm-search">
        <Search
          size={18}
          strokeWidth={1.7}
          className="crm-search-icon"
        />

        <input
          type="search"
          placeholder="Search customers, bookings, payments..."
          aria-label="Search admin workspace"
        />

        <span className="crm-search-shortcut">
          Ctrl K
        </span>
      </div>

      <div className="crm-topbar-actions">
        <button
          type="button"
          className="crm-topbar-icon-button"
          aria-label="Open calendar"
        >
          <CalendarDays
            size={19}
            strokeWidth={1.7}
          />
        </button>

        <button
          type="button"
          className="crm-topbar-icon-button crm-notification-button"
          aria-label="View notifications"
        >
          <Bell size={19} strokeWidth={1.7} />

          <span
            className="crm-notification-dot"
            aria-hidden="true"
          />
        </button>

        <div className="crm-user-profile">
          <div className="crm-user-avatar">
            G
          </div>

          <div className="crm-user-details">
            <strong>Gabrielle</strong>
            <span>Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;