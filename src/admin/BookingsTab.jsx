import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  FolderPlus,
  Plus,
  Search,
  Trash2,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { getSavedAdminPin } from "./adminConfig";
import "./BookingsCRM.css";

const MANUAL_BOOKING_SLOTS = [
  { label: "9:00 AM", value: "09:00" },
  { label: "10:00 AM", value: "10:00" },
  { label: "11:00 AM", value: "11:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "1:00 PM", value: "13:00" },
  { label: "2:00 PM", value: "14:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "4:00 PM", value: "16:00" },
  { label: "5:00 PM", value: "17:00" },
];

const EMPTY_FORM = {
  clientName: "",
  email: "",
  phone: "",
  packageId: "",
  shootDate: "",
  shootTime: "",
  paymentStatus: "UNPAID",
  amountPaid: "",
  notes: "",
};

const EMPTY_PAYMENT_FORM = {
  amountReceived: "",
  paymentMethod: "CASH",
  paymentReference: "",
  paymentDate: "",
  paymentNotes: "",
};

function money(value) {
  return `₱${Number(value || 0).toLocaleString(
    "en-PH"
  )}`;
}

function getTodayInputValue() {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60000
  );

  return localDate
    .toISOString()
    .slice(0, 10);
}

function formatBookingDate(value) {
  const parts = String(value || "")
    .split("-")
    .map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !part)
  ) {
    return value || "No date";
  }

  const [year, month, day] = parts;

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(
    new Date(year, month - 1, day)
  );
}

function formatBookingTime(value) {
  const [hour, minute] = String(
    value || ""
  )
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return value || "No time";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(
    new Date(
      2000,
      0,
      1,
      hour,
      minute
    )
  );
}

function getInitial(name) {
  return (
    String(name || "")
      .trim()
      .charAt(0)
      .toUpperCase() || "A"
  );
}

function getPaymentLabel(status) {
  if (status === "PAID") {
    return "Paid in Full";
  }

  if (status === "PARTIAL") {
    return "Partial Payment";
  }

  return "Pay in Studio";
}

function getPaymentClass(status) {
  if (status === "PAID") {
    return "is-paid";
  }

  if (status === "PARTIAL") {
    return "is-partial";
  }

  return "is-unpaid";
}

async function readJsonResponse(
  response
) {
  const responseText =
    await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }
}

function BookingsTab({
  shouldOpenForm = false,
  onFormOpened,
}) {
  const [bookings, setBookings] =
    useState([]);

  const [packages, setPackages] =
    useState([]);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [
    paymentForm,
    setPaymentForm,
  ] = useState(
    EMPTY_PAYMENT_FORM
  );

  const [
    selectedPaymentBooking,
    setSelectedPaymentBooking,
  ] = useState(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    paymentFilter,
    setPaymentFilter,
  ] = useState("ALL");

  const [isLoading, setIsLoading] =
    useState(false);

  const [
    isLoadingPackages,
    setIsLoadingPackages,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isRecordingPayment,
    setIsRecordingPayment,
  ] = useState(false);

  const [showForm, setShowForm] =
    useState(false);

    const [
    deletingBookingId,
    setDeletingBookingId,
  ] = useState(null);

  const [
    creatingDriveFolderId,
    setCreatingDriveFolderId,
  ] = useState(null);

  const [
    markingShootCompleteId,
    setMarkingShootCompleteId,
  ] = useState(null);

  const [
    bookedTimes,
    setBookedTimes,
  ] = useState([]);

  const [
    isCheckingSlots,
    setIsCheckingSlots,
  ] = useState(false);

  const [slotError, setSlotError] =
    useState("");

  const adminPin =
    getSavedAdminPin();

  const activePackages = useMemo(
    () =>
      packages.filter(
        (studioPackage) =>
          studioPackage.is_active
      ),
    [packages]
  );

  const bookingStats = useMemo(
    () => ({
      total: bookings.length,

      unpaid: bookings.filter(
        (booking) =>
          booking.payment_status ===
          "UNPAID"
      ).length,

      partial: bookings.filter(
        (booking) =>
          booking.payment_status ===
          "PARTIAL"
      ).length,

      paid: bookings.filter(
        (booking) =>
          booking.payment_status ===
            "PAID" ||
          Number(
            booking.remaining_balance ||
              0
          ) <= 0
      ).length,
    }),
    [bookings]
  );

  const filteredBookings =
    useMemo(() => {
      const cleanSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return bookings.filter(
        (booking) => {
          const matchesFilter =
            paymentFilter === "ALL" ||
            booking.payment_status ===
              paymentFilter;

          const searchableText = [
            booking.client_name,
            booking.booking_reference,
            booking.package_title,
            booking.shoot_date,
            booking.shoot_time,
            booking.email,
            booking.phone,
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !cleanSearch ||
            searchableText.includes(
              cleanSearch
            );

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      bookings,
      paymentFilter,
      searchTerm,
    ]);

  const selectedPackage =
    activePackages.find(
      (studioPackage) =>
        String(studioPackage.id) ===
        String(form.packageId)
    ) || null;

  const packagePrice = Number(
    selectedPackage?.default_price ||
      0
  );

  const enteredAmountPaid =
    Number(form.amountPaid || 0);

  const effectiveAmountPaid =
    form.paymentStatus === "PAID"
      ? packagePrice
      : form.paymentStatus ===
          "UNPAID"
        ? 0
        : enteredAmountPaid;

  const remainingBalance =
    Math.max(
      packagePrice -
        effectiveAmountPaid,
      0
    );

  const selectedPaymentBalance =
    Number(
      selectedPaymentBooking
        ?.remaining_balance || 0
    );

  const selectedPaymentPaid =
    Number(
      selectedPaymentBooking
        ?.amount_paid || 0
    );

  const selectedPaymentPrice =
    Number(
      selectedPaymentBooking
        ?.package_price || 0
    );

  const enteredPaymentAmount =
    Number(
      paymentForm.amountReceived ||
        0
    );

  const resultingAmountPaid =
    Math.min(
      selectedPaymentPaid +
        enteredPaymentAmount,
      selectedPaymentPrice
    );

  const resultingBalance =
    Math.max(
      selectedPaymentBalance -
        enteredPaymentAmount,
      0
    );

  const resultingPaymentStatus =
    resultingBalance <= 0
      ? "Paid in Full"
      : "Partial Payment";

  const loadPackages = async () => {
    try {
      setIsLoadingPackages(true);

      const response = await fetch(
        "/api/admin-packages",
        {
          headers: {
            "x-admin-pin": adminPin,
          },
        }
      );

      const data =
        await readJsonResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not load packages."
        );
      }

      const loadedPackages =
        data.packages || [];

      setPackages(loadedPackages);

      const firstActivePackage =
        loadedPackages.find(
          (studioPackage) =>
            studioPackage.is_active
        );

      setForm((current) => {
        const currentPackageExists =
          loadedPackages.some(
            (studioPackage) =>
              studioPackage.is_active &&
              String(
                studioPackage.id
              ) ===
                String(
                  current.packageId
                )
          );

        if (currentPackageExists) {
          return current;
        }

        return {
          ...current,
          packageId:
            firstActivePackage?.id ||
            "",
        };
      });
    } catch (error) {
      console.error(
        "Package loading failed:",
        error
      );

      alert(error.message);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const loadBookings = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        "/api/admin-manual-bookings",
        {
          headers: {
            "x-admin-pin": adminPin,
          },
        }
      );

      const data =
        await readJsonResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not load bookings."
        );
      }

      setBookings(
        data.bookings || []
      );
    } catch (error) {
      console.error(
        "Booking loading failed:",
        error
      );

      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
    loadBookings();
  }, []);

  useEffect(() => {
    if (
      !showForm ||
      !form.shootDate
    ) {
      setBookedTimes([]);
      setSlotError("");
      return;
    }

    let isCancelled = false;

    const checkAvailableSlots =
      async () => {
        try {
          setIsCheckingSlots(true);
          setSlotError("");

          const response = await fetch(
            `/api/available-slots?date=${encodeURIComponent(
              form.shootDate
            )}`
          );

          const data =
            await readJsonResponse(
              response
            );

          if (!response.ok) {
            throw new Error(
              data.error ||
                "Could not check available times."
            );
          }

          if (!isCancelled) {
            setBookedTimes(
              Array.isArray(
                data.bookedTimes
              )
                ? data.bookedTimes
                : []
            );
          }
        } catch (error) {
          console.error(
            "Availability check failed:",
            error
          );

          if (!isCancelled) {
            setBookedTimes([]);
            setSlotError(
              error.message
            );
          }
        } finally {
          if (!isCancelled) {
            setIsCheckingSlots(false);
          }
        }
      };

    checkAvailableSlots();

    return () => {
      isCancelled = true;
    };
  }, [
    form.shootDate,
    showForm,
  ]);

  useEffect(() => {
    if (
      !shouldOpenForm ||
      isLoadingPackages ||
      !activePackages.length
    ) {
      return;
    }

    setSelectedPaymentBooking(
      null
    );

    setForm({
      ...EMPTY_FORM,
      packageId:
        activePackages[0]?.id ||
        "",
    });

    setShowForm(true);
    onFormOpened?.();
  }, [
    shouldOpenForm,
    isLoadingPackages,
    activePackages.length,
    onFormOpened,
  ]);

  const updateForm = (event) => {
    const { name, value } =
      event.target;

    setForm((current) => {
      if (name === "shootDate") {
        return {
          ...current,
          shootDate: value,
          shootTime: "",
        };
      }

      if (
        name === "paymentStatus"
      ) {
        return {
          ...current,
          paymentStatus: value,
          amountPaid:
            value === "PAID"
              ? String(packagePrice)
              : value === "UNPAID"
                ? ""
                : current.amountPaid,
        };
      }

      if (name === "packageId") {
        const nextPackage =
          activePackages.find(
            (studioPackage) =>
              String(
                studioPackage.id
              ) === String(value)
          );

        const nextPrice = Number(
          nextPackage?.default_price ||
            0
        );

        return {
          ...current,
          packageId: value,
          amountPaid:
            current.paymentStatus ===
            "PAID"
              ? String(nextPrice)
              : current.paymentStatus ===
                  "UNPAID"
                ? ""
                : current.amountPaid,
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  };

  const updatePaymentForm = (
    event
  ) => {
    const { name, value } =
      event.target;

    setPaymentForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openManualBookingForm =
    () => {
      if (
        !activePackages.length
      ) {
        alert(
          "There are no active packages available."
        );
        return;
      }

      setSelectedPaymentBooking(
        null
      );

      setForm({
        ...EMPTY_FORM,
        packageId:
          activePackages[0]?.id ||
          "",
      });

      setShowForm(true);
    };

  const closeManualBookingForm =
    () => {
      setShowForm(false);

      setForm({
        ...EMPTY_FORM,
        packageId:
          activePackages[0]?.id ||
          "",
      });
    };

  const openRecordPayment = (
    booking
  ) => {
    const balance = Number(
      booking.remaining_balance ||
        0
    );

    if (
      booking.payment_status ===
        "PAID" ||
      balance <= 0
    ) {
      alert(
        "This booking is already fully paid."
      );
      return;
    }

    setShowForm(false);

    setSelectedPaymentBooking(
      booking
    );

    setPaymentForm({
      ...EMPTY_PAYMENT_FORM,
      amountReceived:
        String(balance),
      paymentDate:
        getTodayInputValue(),
    });
  };

  const closePaymentDrawer =
    () => {
      if (isRecordingPayment) {
        return;
      }

      setSelectedPaymentBooking(
        null
      );

      setPaymentForm(
        EMPTY_PAYMENT_FORM
      );
    };

  const saveManualBooking =
    async (event) => {
      event.preventDefault();

      if (
        !form.clientName.trim() ||
        !form.packageId ||
        !form.shootDate ||
        !form.shootTime
      ) {
        alert(
          "Please complete the client name, package, date, and time."
        );
        return;
      }

      if (
        bookedTimes.includes(
          form.shootTime
        )
      ) {
        alert(
          "That time is already booked."
        );
        return;
      }

      if (
        form.paymentStatus ===
          "PARTIAL" &&
        (
          effectiveAmountPaid <= 0 ||
          effectiveAmountPaid >=
            packagePrice
        )
      ) {
        alert(
          "Enter a valid partial payment."
        );
        return;
      }

      try {
        setIsSaving(true);

        const response = await fetch(
          "/api/admin-manual-bookings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-admin-pin":
                adminPin,
            },
            body: JSON.stringify({
              clientName:
                form.clientName.trim(),
              email:
                form.email.trim(),
              phone:
                form.phone.trim(),
              packageId:
                form.packageId,
              shootDate:
                form.shootDate,
              shootTime:
                form.shootTime,
              paymentStatus:
                form.paymentStatus,
              amountPaid:
                effectiveAmountPaid,
              notes:
                form.notes.trim(),
            }),
          }
        );

        const data =
          await readJsonResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not save booking."
          );
        }

        setShowForm(false);

        setForm({
          ...EMPTY_FORM,
          packageId:
            activePackages[0]?.id ||
            "",
        });

        await loadBookings();

        alert(
          "Manual booking saved successfully."
        );
      } catch (error) {
        console.error(
          "Manual booking failed:",
          error
        );

        alert(error.message);
      } finally {
        setIsSaving(false);
      }
    };

  const recordPayment = async (
    event
  ) => {
    event.preventDefault();

    if (
      !selectedPaymentBooking
    ) {
      return;
    }

    const amountReceived =
      Number(
        paymentForm.amountReceived ||
          0
      );

    const currentBalance =
      Number(
        selectedPaymentBooking
          .remaining_balance || 0
      );

    if (
      !Number.isFinite(
        amountReceived
      ) ||
      amountReceived <= 0
    ) {
      alert(
        "Enter a valid payment amount."
      );
      return;
    }

    if (
      amountReceived >
      currentBalance
    ) {
      alert(
        `Payment cannot exceed ${money(
          currentBalance
        )}.`
      );
      return;
    }

    try {
      setIsRecordingPayment(true);

      const response = await fetch(
        "/api/admin-manual-bookings",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            "x-admin-pin":
              adminPin,
          },
          body: JSON.stringify({
            id:
              selectedPaymentBooking.id,
            amountReceived,
            paymentMethod:
              paymentForm.paymentMethod,
            paymentReference:
              paymentForm.paymentReference.trim(),
            paymentDate:
              `${paymentForm.paymentDate}T12:00:00+08:00`,
            paymentNotes:
              paymentForm.paymentNotes.trim(),
          }),
        }
      );

      const data =
        await readJsonResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not record payment."
        );
      }

      await loadBookings();

      setSelectedPaymentBooking(
        null
      );

      setPaymentForm(
        EMPTY_PAYMENT_FORM
      );

      alert(
        data.message ||
          "Payment recorded successfully."
      );
    } catch (error) {
      console.error(
        "Payment recording failed:",
        error
      );

      alert(error.message);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const markShootComplete =
    async (booking) => {
      if (!booking?.id) {
        alert(
          "This booking does not have a valid ID."
        );
        return;
      }

      const confirmed =
        window.confirm(
          `Mark the shoot for "${booking.client_name}" as completed?\n\nThis will move it into your For Editing queue.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setMarkingShootCompleteId(
          booking.id
        );

        const response = await fetch(
          "/api/admin-manual-bookings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-admin-pin":
                adminPin,
            },
            body: JSON.stringify({
              action:
                "mark_shoot_complete",
              id: booking.id,
            }),
          }
        );

        const data =
          await readJsonResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not mark the shoot as completed."
          );
        }

        if (data.booking) {
          setBookings((current) =>
            current.map((item) =>
              item.id === booking.id
                ? data.booking
                : item
            )
          );
        } else {
          await loadBookings();
        }

        alert(
          data.message ||
            "Shoot marked complete and moved to For Editing."
        );
      } catch (error) {
        console.error(
          "Mark shoot complete failed:",
          error
        );

        alert(error.message);
      } finally {
        setMarkingShootCompleteId(
          null
        );
      }
    };

  const createClientDriveFolder =
    async (booking) => {
      if (!booking?.id) {
        alert(
          "This booking does not have a valid ID."
        );
        return;
      }

      /*
       * If the booking already has a
       * Google Drive folder saved,
       * open that instead of creating
       * another one.
       */
      if (
        booking.client_drive_folder_url
      ) {
        window.open(
          booking.client_drive_folder_url,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }

      try {
        setCreatingDriveFolderId(
          booking.id
        );

        const response = await fetch(
          "/api/admin-manual-bookings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-admin-pin":
                adminPin,
            },

            body: JSON.stringify({
              action:
                "create_client_drive_folder",

              id:
                booking.id,
            }),
          }
        );

        const data =
          await readJsonResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not create the client folder."
          );
        }

        /*
         * Replace the booking in local
         * state immediately.
         *
         * This changes the button from
         * "Create Client Folder"
         * to "Open Folder".
         */
        if (data.booking) {
          setBookings((current) =>
            current.map((item) =>
              item.id === booking.id
                ? data.booking
                : item
            )
          );
        } else {
          /*
           * Fallback in case the API did
           * not return the updated booking.
           */
          await loadBookings();
        }

        alert(
          data.message ||
            "Client Google Drive folder created successfully."
        );
      } catch (error) {
        console.error(
          "Client Drive folder creation failed:",
          error
        );

        alert(error.message);
      } finally {
        setCreatingDriveFolderId(
          null
        );
      }
    };


  const deleteManualBooking =
    async (booking) => {
      const confirmed =
        window.confirm(
          `Delete the booking for "${booking.client_name}"?\n\nThis also removes its Calendar event and Sheet row.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingBookingId(
          booking.id
        );

        const response = await fetch(
          "/api/admin-manual-bookings",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
              "x-admin-pin":
                adminPin,
            },
            body: JSON.stringify({
              id: booking.id,
            }),
          }
        );

        const data =
          await readJsonResponse(
            response
          );

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Could not delete booking."
          );
        }

        setBookings((current) =>
          current.filter(
            (item) =>
              item.id !== booking.id
          )
        );

        alert(
          "Booking deleted successfully."
        );
      } catch (error) {
        console.error(
          "Booking deletion failed:",
          error
        );

        alert(error.message);
      } finally {
        setDeletingBookingId(
          null
        );
      }
    };

  return (
    <section className="crm-bookings-page">
      <div className="crm-bookings-overview">
        <article className="crm-bookings-stat">
          <div className="crm-bookings-stat-icon">
            <UsersRound size={19} />
          </div>

          <div className="crm-bookings-stat-content">
            <span className="crm-bookings-stat-label">
              Total bookings
            </span>

            <strong className="crm-bookings-stat-value">
              {bookingStats.total}
            </strong>

            <span className="crm-bookings-stat-caption">
              Manual studio records
            </span>
          </div>
        </article>

        <article className="crm-bookings-stat is-gold">
          <div className="crm-bookings-stat-icon">
            <Clock3 size={19} />
          </div>

          <div className="crm-bookings-stat-content">
            <span className="crm-bookings-stat-label">
              Pay in studio
            </span>

            <strong className="crm-bookings-stat-value">
              {bookingStats.unpaid}
            </strong>

            <span className="crm-bookings-stat-caption">
              Awaiting payment
            </span>
          </div>
        </article>

        <article className="crm-bookings-stat is-amber">
          <div className="crm-bookings-stat-icon">
            <WalletCards size={19} />
          </div>

          <div className="crm-bookings-stat-content">
            <span className="crm-bookings-stat-label">
              Partial
            </span>

            <strong className="crm-bookings-stat-value">
              {bookingStats.partial}
            </strong>

            <span className="crm-bookings-stat-caption">
              Remaining balance
            </span>
          </div>
        </article>

        <article className="crm-bookings-stat is-green">
          <div className="crm-bookings-stat-icon">
            <CheckCircle2 size={19} />
          </div>

          <div className="crm-bookings-stat-content">
            <span className="crm-bookings-stat-label">
              Fully paid
            </span>

            <strong className="crm-bookings-stat-value">
              {bookingStats.paid}
            </strong>

            <span className="crm-bookings-stat-caption">
              Payment completed
            </span>
          </div>
        </article>
      </div>

      <div className="crm-bookings-shell">
        <div className="crm-bookings-toolbar">
          <div className="crm-bookings-toolbar-left">
            <label className="crm-bookings-search">
              <Search
                size={17}
                strokeWidth={1.7}
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search client, package, reference..."
              />
            </label>

            <select
              className="crm-bookings-filter"
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(
                  event.target.value
                )
              }
            >
              <option value="ALL">
                All payment statuses
              </option>

              <option value="UNPAID">
                Pay in Studio
              </option>

              <option value="PARTIAL">
                Partial Payment
              </option>

              <option value="PAID">
                Paid in Full
              </option>
            </select>
          </div>

          <button
            type="button"
            className="crm-bookings-add-button"
            onClick={
              openManualBookingForm
            }
            disabled={
              isLoadingPackages ||
              !activePackages.length
            }
          >
            <Plus size={16} />

            {isLoadingPackages
              ? "Loading..."
              : "Add Manual Booking"}
          </button>
        </div>

        <div className="crm-bookings-list-heading">
          <div>
            <h2>Manual bookings</h2>

            <p>
              Manage studio schedules and
              payment collection.
            </p>
          </div>

          <span className="crm-bookings-results-count">
            Showing{" "}
            {filteredBookings.length} of{" "}
            {bookings.length}
          </span>
        </div>

        {isLoading ? (
          <div className="crm-bookings-empty">
            <div className="crm-bookings-empty-icon">
              <CalendarDays size={21} />
            </div>

            <h3>Loading bookings</h3>

            <p>
              Retrieving your studio
              booking records.
            </p>
          </div>
        ) : filteredBookings.length ===
          0 ? (
          <div className="crm-bookings-empty">
            <div className="crm-bookings-empty-icon">
              <Search size={21} />
            </div>

            <h3>No bookings found</h3>

            <p>
              No manual bookings match
              your current search or
              payment filter.
            </p>
          </div>
        ) : (
          <div className="crm-bookings-table">
            <div className="crm-bookings-table-head">
              <span>Client</span>
              <span>Package</span>
              <span>Schedule</span>
              <span>Payment</span>
              <span>Actions</span>
            </div>

            {filteredBookings.map(
              (booking) => {
                const bookingBalance =
                  Number(
                    booking.remaining_balance ||
                      0
                  );

                const isFullyPaid =
                  booking.payment_status ===
                    "PAID" ||
                  bookingBalance <= 0;

                const postProductionLabel =
                  booking.post_production_status ===
                  "DELIVERED"
                    ? "Delivered"
                    : booking.post_production_status ===
                        "READY_FOR_DELIVERY"
                      ? "Ready for Delivery"
                      : "For Editing";

                return (
                  <article
                    className="crm-booking-row"
                    key={booking.id}
                  >
                    <div className="crm-booking-cell">
                      <span className="crm-booking-cell-label">
                        Client
                      </span>

                      <div className="crm-booking-client">
                        <div className="crm-booking-avatar">
                          {getInitial(
                            booking.client_name
                          )}
                        </div>

                        <div className="crm-booking-primary">
                          <strong>
                            {
                              booking.client_name
                            }
                          </strong>

                          <span>
                            {
                              booking.booking_reference
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="crm-booking-cell">
                      <span className="crm-booking-cell-label">
                        Package
                      </span>

                      <div className="crm-booking-detail">
                        <strong>
                          {
                            booking.package_title
                          }
                        </strong>

                        <span>
                          {money(
                            booking.package_price
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="crm-booking-cell">
                      <span className="crm-booking-cell-label">
                        Schedule
                      </span>

                      <div className="crm-booking-detail">
                        <strong>
                          {formatBookingDate(
                            booking.shoot_date
                          )}
                        </strong>

                        <span>
                          {formatBookingTime(
                            booking.shoot_time
                          )}{" "}
                          ·{" "}
                          {booking.booking_status ||
                            "Confirmed"}
                        </span>
                      </div>
                    </div>

                    <div className="crm-booking-cell">
                      <span className="crm-booking-cell-label">
                        Payment
                      </span>

                      <div className="crm-booking-payment">
                        <span
                          className={`crm-payment-badge ${getPaymentClass(
                            booking.payment_status
                          )}`}
                        >
                          {booking.payment_status ===
                          "PAID" ? (
                            <CheckCircle2
                              size={13}
                            />
                          ) : booking.payment_status ===
                            "PARTIAL" ? (
                            <WalletCards
                              size={13}
                            />
                          ) : (
                            <Clock3
                              size={13}
                            />
                          )}

                          {getPaymentLabel(
                            booking.payment_status
                          )}
                        </span>

                        <span className="crm-payment-breakdown">
                          Paid{" "}
                          {money(
                            booking.amount_paid
                          )}
                          <br />
                          Balance{" "}
                          {money(
                            bookingBalance
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="crm-booking-cell">
                      <span className="crm-booking-cell-label">
                        Actions
                      </span>

                                           <div className="crm-booking-actions">
  {booking.shoot_status === "COMPLETED" ? (
    <span className="crm-booking-paid-label">
      <CheckCircle2 size={14} />
      {postProductionLabel}
    </span>
  ) : (
    <button
      type="button"
      className="crm-booking-action is-payment"
      onClick={() =>
        markShootComplete(booking)
      }
      disabled={
        markingShootCompleteId ===
        booking.id
      }
    >
      <CheckCircle2 size={14} />

      {markingShootCompleteId ===
      booking.id
        ? "Updating..."
        : "Mark Shoot Complete"}
    </button>
  )}

  {!isFullyPaid ? (
    <button
      type="button"
      className="crm-booking-action is-payment"
      onClick={() =>
        openRecordPayment(booking)
      }
    >
      <CreditCard size={14} />
      Record Payment
    </button>
  ) : (
    <span className="crm-booking-paid-label">
      <CheckCircle2 size={14} />
      Paid
    </span>
  )}

  {booking.client_drive_folder_url ? (
    <button
      type="button"
      className="crm-booking-action is-payment"
      onClick={() =>
        window.open(
          booking.client_drive_folder_url,
          "_blank",
          "noopener,noreferrer"
        )
      }
      title={
        booking.client_drive_folder_name ||
        "Open client folder"
      }
    >
      <ExternalLink size={14} />
      Open Folder
    </button>
  ) : (
    <button
      type="button"
      className="crm-booking-action is-payment"
      onClick={() =>
        createClientDriveFolder(booking)
      }
      disabled={
        creatingDriveFolderId ===
        booking.id
      }
    >
      <FolderPlus size={14} />

      {creatingDriveFolderId ===
      booking.id
        ? "Creating..."
        : "Create Client Folder"}
    </button>
  )}

  <button
    type="button"
    className="crm-booking-action is-delete"
    onClick={() =>
      deleteManualBooking(booking)
    }
    disabled={
      deletingBookingId === booking.id
    }
    title="Delete booking"
    aria-label="Delete booking"
  >
    <Trash2 size={15} />
  </button>
</div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="admin-drawer-overlay"
          onClick={
            closeManualBookingForm
          }
        >
          <aside
            className="admin-booking-drawer crm-booking-drawer-v2"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="admin-drawer-header">
              <div>
                <p className="admin-eyebrow">
                  New Studio Booking
                </p>

                <h2>
                  Add Manual Booking
                </h2>
              </div>

              <button
                type="button"
                className="admin-drawer-close"
                onClick={
                  closeManualBookingForm
                }
                disabled={isSaving}
              >
                ×
              </button>
            </div>

            <p className="admin-drawer-intro">
              Add the client, package,
              schedule and payment details.
            </p>

            <form
              className="manual-booking-form"
              onSubmit={
                saveManualBooking
              }
            >
              <div className="admin-form-grid">
                <label>
                  Client Name
                  <input
                    name="clientName"
                    value={
                      form.clientName
                    }
                    onChange={
                      updateForm
                    }
                    required
                  />
                </label>

                <label>
                  Mobile Number
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={
                      updateForm
                    }
                  />
                </label>
              </div>

              <label>
                Email Address
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                />
              </label>

              <div className="admin-form-grid">
                <label>
                  Package
                  <select
                    name="packageId"
                    value={
                      form.packageId
                    }
                    onChange={
                      updateForm
                    }
                    required
                  >
                    <option value="">
                      Choose package
                    </option>

                    {activePackages.map(
                      (studioPackage) => (
                        <option
                          key={
                            studioPackage.id
                          }
                          value={
                            studioPackage.id
                          }
                        >
                          {
                            studioPackage.name
                          }{" "}
                          —{" "}
                          {money(
                            studioPackage.default_price
                          )}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Payment Status
                  <select
                    name="paymentStatus"
                    value={
                      form.paymentStatus
                    }
                    onChange={
                      updateForm
                    }
                  >
                    <option value="UNPAID">
                      Pay in Studio
                    </option>

                    <option value="PARTIAL">
                      Partial Payment
                    </option>

                    <option value="PAID">
                      Paid in Full
                    </option>
                  </select>
                </label>
              </div>

              <div className="admin-form-grid">
                <label>
                  Shoot Date
                  <input
                    name="shootDate"
                    type="date"
                    value={
                      form.shootDate
                    }
                    onChange={
                      updateForm
                    }
                    required
                  />
                </label>

                <label>
                  Shoot Time
                  <select
                    name="shootTime"
                    value={
                      form.shootTime
                    }
                    onChange={
                      updateForm
                    }
                    disabled={
                      !form.shootDate ||
                      isCheckingSlots ||
                      Boolean(slotError)
                    }
                    required
                  >
                    <option value="">
                      {!form.shootDate
                        ? "Choose a date first"
                        : isCheckingSlots
                          ? "Checking times..."
                          : "Choose time"}
                    </option>

                    {MANUAL_BOOKING_SLOTS.map(
                      (slot) => {
                        const isBooked =
                          bookedTimes.includes(
                            slot.value
                          );

                        return (
                          <option
                            key={
                              slot.value
                            }
                            value={
                              slot.value
                            }
                            disabled={
                              isBooked
                            }
                          >
                            {slot.label}
                            {isBooked
                              ? " — Booked"
                              : ""}
                          </option>
                        );
                      }
                    )}
                  </select>

                  {slotError && (
                    <span className="admin-field-error">
                      {slotError}
                    </span>
                  )}
                </label>
              </div>

              <div className="admin-form-grid">
                <label>
                  Amount Paid
                  <input
                    name="amountPaid"
                    type="number"
                    min="0"
                    max={packagePrice}
                    step="1"
                    value={
                      form.paymentStatus ===
                      "PAID"
                        ? packagePrice
                        : form.paymentStatus ===
                            "UNPAID"
                          ? 0
                          : form.amountPaid
                    }
                    onChange={
                      updateForm
                    }
                    disabled={
                      form.paymentStatus !==
                      "PARTIAL"
                    }
                  />
                </label>

                <label>
                  Remaining Balance
                  <input
                    value={money(
                      remainingBalance
                    )}
                    readOnly
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={updateForm}
                  placeholder="Theme, number of people or special requests."
                />
              </label>

              <div className="manual-booking-summary">
                <div>
                  <span>
                    Package Price
                  </span>
                  <strong>
                    {money(packagePrice)}
                  </strong>
                </div>

                <div>
                  <span>
                    Amount Paid
                  </span>
                  <strong>
                    {money(
                      effectiveAmountPaid
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Remaining Balance
                  </span>
                  <strong>
                    {money(
                      remainingBalance
                    )}
                  </strong>
                </div>
              </div>

              <div className="package-form-actions">
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={
                    isSaving ||
                    !selectedPackage
                  }
                >
                  {isSaving
                    ? "Saving..."
                    : "Save Manual Booking"}
                </button>

                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={
                    closeManualBookingForm
                  }
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {selectedPaymentBooking && (
        <div
          className="admin-drawer-overlay"
          onClick={
            closePaymentDrawer
          }
        >
          <aside
            className="admin-booking-drawer crm-booking-drawer-v2"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="admin-drawer-header">
              <div>
                <p className="admin-eyebrow">
                  Payment Collection
                </p>

                <h2>
                  Record Payment
                </h2>
              </div>

              <button
                type="button"
                className="admin-drawer-close"
                onClick={
                  closePaymentDrawer
                }
                disabled={
                  isRecordingPayment
                }
              >
                ×
              </button>
            </div>

            <div className="crm-payment-client-card">
              <strong>
                {
                  selectedPaymentBooking.client_name
                }
              </strong>

              <span>
                {
                  selectedPaymentBooking.booking_reference
                }
              </span>
            </div>

            <div className="manual-booking-summary">
              <div>
                <span>
                  Package Price
                </span>
                <strong>
                  {money(
                    selectedPaymentPrice
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Previously Paid
                </span>
                <strong>
                  {money(
                    selectedPaymentPaid
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Current Balance
                </span>
                <strong>
                  {money(
                    selectedPaymentBalance
                  )}
                </strong>
              </div>
            </div>

            <form
              className="manual-booking-form"
              onSubmit={
                recordPayment
              }
            >
              <label>
                Amount Received
                <input
                  name="amountReceived"
                  type="number"
                  min="0.01"
                  max={
                    selectedPaymentBalance
                  }
                  step="0.01"
                  value={
                    paymentForm.amountReceived
                  }
                  onChange={
                    updatePaymentForm
                  }
                  required
                />
              </label>

              <div className="admin-form-grid">
                <label>
                  Payment Method
                  <select
                    name="paymentMethod"
                    value={
                      paymentForm.paymentMethod
                    }
                    onChange={
                      updatePaymentForm
                    }
                  >
                    <option value="CASH">
                      Cash
                    </option>

                    <option value="GCASH">
                      GCash
                    </option>

                    <option value="CARD">
                      Card
                    </option>

                    <option value="BANK_TRANSFER">
                      Bank Transfer
                    </option>

                    <option value="OTHER">
                      Other
                    </option>
                  </select>
                </label>

                <label>
                  Payment Date
                  <input
                    name="paymentDate"
                    type="date"
                    value={
                      paymentForm.paymentDate
                    }
                    onChange={
                      updatePaymentForm
                    }
                    required
                  />
                </label>
              </div>

              <label>
                Payment Reference
                <input
                  name="paymentReference"
                  value={
                    paymentForm.paymentReference
                  }
                  onChange={
                    updatePaymentForm
                  }
                  placeholder="Receipt or transaction reference"
                />
              </label>

              <label>
                Payment Notes
                <textarea
                  name="paymentNotes"
                  value={
                    paymentForm.paymentNotes
                  }
                  onChange={
                    updatePaymentForm
                  }
                  placeholder="Example: Full balance paid in cash."
                />
              </label>

              <div className="manual-booking-summary">
                <div>
                  <span>
                    New Total Paid
                  </span>
                  <strong>
                    {money(
                      resultingAmountPaid
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    New Balance
                  </span>
                  <strong>
                    {money(
                      resultingBalance
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    New Status
                  </span>
                  <strong>
                    {
                      resultingPaymentStatus
                    }
                  </strong>
                </div>
              </div>

              <div className="package-form-actions">
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={
                    isRecordingPayment
                  }
                >
                  {isRecordingPayment
                    ? "Recording..."
                    : "Record Payment"}
                </button>

                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={
                    closePaymentDrawer
                  }
                  disabled={
                    isRecordingPayment
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}

export default BookingsTab;
