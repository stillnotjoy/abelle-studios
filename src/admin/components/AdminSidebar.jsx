import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserRoundSearch,
  CreditCard,
  Megaphone,
  Tags,
  Workflow,
  BarChart3,
  Package,
  BadgePercent,
  CalendarX2,
  Settings as SettingsIcon,
  Plug,
} from "lucide-react";

const NAVIGATION_GROUPS = [
  {
    title: "",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        enabled: true,
      },
      {
        label: "Calendar",
        icon: CalendarDays,
        enabled: true,
      },
    ],
  },
  {
    title: "CRM",
    items: [
      {
        label: "Customers",
        icon: Users,
        enabled: false,
      },
      {
        label: "Leads",
        icon: UserRoundSearch,
        enabled: false,
      },
      {
        label: "Bookings",
        icon: CalendarDays,
        enabled: true,
      },
      {
        label: "Payments",
        icon: CreditCard,
        enabled: false,
      },
    ],
  },
  {
    title: "Marketing",
    items: [
      {
        label: "Campaigns",
        icon: Megaphone,
        enabled: false,
      },
      {
        label: "Segments",
        icon: Tags,
        enabled: false,
      },
      {
        label: "Automations",
        icon: Workflow,
        enabled: false,
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Overview",
        icon: BarChart3,
        enabled: false,
      },
      {
        label: "Revenue",
        icon: CreditCard,
        enabled: false,
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Packages",
        icon: Package,
        enabled: true,
      },
      {
        label: "Discount Codes",
        icon: BadgePercent,
        enabled: true,
      },
      {
        label: "Blocked Dates",
        icon: CalendarX2,
        enabled: true,
      },
      {
        label: "Settings",
        icon: SettingsIcon,
        enabled: true,
      },
      {
        label: "Integrations",
        icon: Plug,
        enabled: false,
      },
    ],
  },
];

function AdminSidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}) {
  return (
    <aside
  className={[
    "crm-sidebar",
    isOpen ? "crm-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ")}
>
      <div className="crm-sidebar-brand">
        <img
          src="/assets/logo-full-black.png"
          alt="Abelle Studios"
          className="crm-sidebar-logo"
        />

        <span className="crm-sidebar-subtitle">
          Photo Studio
        </span>
      </div>

      <nav
        className="crm-sidebar-navigation"
        aria-label="Admin navigation"
      >
        {NAVIGATION_GROUPS.map(
          (group, groupIndex) => (
            <div
              className="crm-nav-group"
              key={`${group.title}-${groupIndex}`}
            >
              {group.title && (
                <p className="crm-nav-group-title">
                  {group.title}
                </p>
              )}

              <div className="crm-nav-group-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeTab === item.label;

                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={[
                        "crm-nav-item",
                        isActive
                          ? "crm-nav-item-active"
                          : "",
                        !item.enabled
                          ? "crm-nav-item-disabled"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
onClick={() => {
  if (item.enabled) {
    onTabChange(item.label);
    onClose?.();
  }
}}
                      disabled={!item.enabled}
                      aria-current={
                        isActive
                          ? "page"
                          : undefined
                      }
                    >
                      <span className="crm-nav-item-icon">
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                        />
                      </span>

                      <span className="crm-nav-item-label">
                        {item.label}
                      </span>

                      {!item.enabled && (
                        <span className="crm-coming-soon">
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}
      </nav>

      <div className="crm-sidebar-footer">
        <p>Abelle Studios CRM</p>
        <span>Admin workspace</span>
      </div>
    </aside>
  );
}

export default AdminSidebar;
