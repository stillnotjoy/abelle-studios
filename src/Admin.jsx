import { useEffect, useState } from "react";

import "./Admin.css";
import "./AdminCRM.css";

import { supabase } from "./lib/supabaseClient";
import AdminLogin from "./admin/AdminLogin";

import { getSavedAdminPin } from "./admin/adminConfig";

import AdminSidebar from "./admin/components/AdminSidebar";
import AdminTopbar from "./admin/components/AdminTopbar";

import DashboardTab from "./admin/DashboardTab";
import CalendarTab from "./admin/CalendarTab";
import BookingsTab from "./admin/BookingsTab";
import DiscountCodesTab from "./admin/DiscountCodesTab";
import PackagesTab from "./admin/PackagesTab";
import BlockedDatesTab from "./admin/BlockedDatesTab";
import SettingsTab from "./admin/SettingsTab";

const PAGE_DETAILS = {
  Dashboard: {
    title: "Dashboard",
    description:
      "A clear view of your studio bookings, payments, customers, and daily activity.",
  },

  Calendar: {
    title: "Studio Calendar",
    description:
      "See every studio booking and payment status in one schedule.",
  },

  Bookings: {
    title: "Bookings",
    description:
      "Manage online, manual, walk-in, and pay-in-studio bookings.",
  },

  "Discount Codes": {
    title: "Discount Codes",
    description:
      "Create and manage promotional codes for studio packages.",
  },

  Packages: {
    title: "Packages & Services",
    description:
      "Manage your studio packages, prices, deposits, inclusions, and availability.",
  },

  "Blocked Dates": {
    title: "Blocked Dates",
    description:
      "Prevent customers from selecting dates when the studio is unavailable.",
  },

  Settings: {
    title: "Studio Settings",
    description:
      "Manage important studio and booking system preferences.",
  },
};

function Admin() {
  const [session, setSession] =
    useState(null);

  const [
    isCheckingSession,
    setIsCheckingSession,
  ] = useState(true);

  const [activeTab, setActiveTab] =
    useState("Dashboard");

  const [
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  ] = useState(false);

  const [
    shouldOpenBookingForm,
    setShouldOpenBookingForm,
  ] = useState(false);

  /*
   * Keep the legacy admin PIN available
   * temporarily because the current admin
   * API routes still use x-admin-pin.
   */
  useEffect(() => {
    getSavedAdminPin();
  }, []);

  /*
   * Check whether the administrator already
   * has an active Supabase login session.
   *
   * This also listens for future login and
   * logout events.
   */
  useEffect(() => {
    let isMounted = true;

    const loadExistingSession =
      async () => {
        const {
          data,
          error,
        } =
          await supabase.auth.getSession();

        if (error) {
          console.error(
            "Could not load admin session:",
            error
          );
        }

        if (isMounted) {
          setSession(
            data?.session || null
          );

          setIsCheckingSession(false);
        }
      };

    loadExistingSession();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!isMounted) {
            return;
          }

          setSession(
            nextSession || null
          );

          setIsCheckingSession(false);
        }
      );

    return () => {
      isMounted = false;

      authListener.subscription.unsubscribe();
    };
  }, []);

  const pageDetails =
    PAGE_DETAILS[activeTab] ||
    PAGE_DETAILS.Dashboard;

  const openNewBooking = () => {
    setShouldOpenBookingForm(true);
    setActiveTab("Bookings");
  };

  /*
   * Show a simple loading screen while
   * Supabase checks the current session.
   */
  if (isCheckingSession) {
    return (
      <main className="crm-auth-loading">
        <img
          src="/assets/logo-full-black.png"
          alt="Abelle Studios"
        />

        <div className="crm-auth-spinner" />

        <p>
          Opening your secure workspace...
        </p>
      </main>
    );
  }

  /*
   * Visitors without a valid Supabase
   * session see the login screen.
   */
  if (!session) {
    return (
      <AdminLogin
        onSignedIn={setSession}
      />
    );
  }

  return (
    <main className="crm-admin-shell">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={isMobileMenuOpen}
        onClose={() =>
          setIsMobileMenuOpen(false)
        }
      />

      {isMobileMenuOpen && (
        <button
          type="button"
          className="crm-sidebar-overlay"
          onClick={() =>
            setIsMobileMenuOpen(false)
          }
          aria-label="Close navigation"
        />
      )}

      <div className="crm-content-column">
        <AdminTopbar
          onMobileMenuToggle={() =>
            setIsMobileMenuOpen(
              (current) => !current
            )
          }
        />

        <div className="crm-page-content">
          {activeTab !== "Dashboard" && (
            <header className="crm-page-header">
              <div>
                <p className="crm-page-eyebrow">
                  Abelle Studios CRM
                </p>

                <h1>
                  {pageDetails.title}
                </h1>

                <p className="crm-page-description">
                  {
                    pageDetails.description
                  }
                </p>
              </div>
            </header>
          )}

          <section className="crm-page-body">
            {activeTab === "Dashboard" && (
              <DashboardTab
                onNavigate={setActiveTab}
                onCreateBooking={
                  openNewBooking
                }
              />
            )}

            {activeTab === "Calendar" && (
              <CalendarTab
                onNavigate={setActiveTab}
                onCreateBooking={
                  openNewBooking
                }
              />
            )}

            {activeTab === "Bookings" && (
              <BookingsTab
                shouldOpenForm={
                  shouldOpenBookingForm
                }
                onFormOpened={() =>
                  setShouldOpenBookingForm(
                    false
                  )
                }
              />
            )}

            {activeTab ===
              "Discount Codes" && (
              <DiscountCodesTab />
            )}

            {activeTab === "Packages" && (
              <PackagesTab />
            )}

            {activeTab ===
              "Blocked Dates" && (
              <BlockedDatesTab />
            )}

            {activeTab === "Settings" && (
              <SettingsTab />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default Admin;
