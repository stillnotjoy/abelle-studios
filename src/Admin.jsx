import { useEffect, useState } from "react";
import "./Admin.css";

import {
  LayoutDashboard,
  CalendarDays,
  BadgePercent,
  Package,
  CalendarX2,
  Settings,
} from "lucide-react";

import {
  ADMIN_TABS,
  getSavedAdminPin,
} from "./admin/adminConfig";

import DashboardTab from "./admin/DashboardTab";
import BookingsTab from "./admin/BookingsTab";
import DiscountCodesTab from "./admin/DiscountCodesTab";
import PackagesTab from "./admin/PackagesTab";
import BlockedDatesTab from "./admin/BlockedDatesTab";
import SettingsTab from "./admin/SettingsTab";

const TAB_ICONS = {
  Dashboard: LayoutDashboard,
  Bookings: CalendarDays,
  "Discount Codes": BadgePercent,
  Packages: Package,
  "Blocked Dates": CalendarX2,
  Settings,
};

function Admin() {
  const [activeTab, setActiveTab] =
    useState("Dashboard");

  useEffect(() => {
    getSavedAdminPin();
  }, []);

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img
  src="/assets/logo-full-black.png"
  alt="Abelle Studios"
  className="admin-sidebar-logo"
/>
        </div>

        <nav className="admin-nav">
          {ADMIN_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab];

            return (
              <button
                key={tab}
                type="button"
                className={
                  activeTab === tab
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab(tab)
                }
              >
                {Icon && (
                  <span className="admin-nav-icon">
                    <Icon
                      size={19}
                      strokeWidth={1.8}
                    />
                  </span>
                )}

                <span>{tab}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <h1>{activeTab}</h1>
          </div>

          {activeTab !== "Dashboard" && (
            <button
              type="button"
              className="admin-logout"
              onClick={() =>
                setActiveTab("Dashboard")
              }
            >
              Dashboard
            </button>
          )}
        </header>

        {activeTab === "Dashboard" && (
          <DashboardTab />
        )}

        {activeTab === "Bookings" && (
          <BookingsTab />
        )}

        {activeTab === "Discount Codes" && (
          <DiscountCodesTab />
        )}

        {activeTab === "Packages" && (
          <PackagesTab />
        )}

        {activeTab === "Blocked Dates" && (
          <BlockedDatesTab />
        )}

        {activeTab === "Settings" && (
          <SettingsTab />
        )}
      </section>
    </main>
  );
}

export default Admin;