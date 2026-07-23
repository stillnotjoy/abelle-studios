import { useEffect, useMemo, useState } from "react";
import { getSavedAdminPin } from "./adminConfig";

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

async function readJsonResponse(response) {
  const responseText = await response.text();

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

function BookingsTab() {
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [deletingBookingId, setDeletingBookingId] =
  useState(null);

const [bookedTimes, setBookedTimes] = useState([]);
const [isCheckingSlots, setIsCheckingSlots] =
  useState(false);
const [slotError, setSlotError] = useState("");


  const adminPin = getSavedAdminPin();

  const activePackages = useMemo(
    () =>
      packages.filter(
        (studioPackage) =>
          studioPackage.is_active
      ),
    [packages]
  );

  const selectedPackage =
    activePackages.find(
      (studioPackage) =>
        String(studioPackage.id) ===
        String(form.packageId)
    ) || null;

  const packagePrice = Number(
    selectedPackage?.default_price || 0
  );

  const enteredAmountPaid = Number(
    form.amountPaid || 0
  );

  const effectiveAmountPaid =
    form.paymentStatus === "PAID"
      ? packagePrice
      : form.paymentStatus === "UNPAID"
        ? 0
        : enteredAmountPaid;

  const remainingBalance = Math.max(
    packagePrice - effectiveAmountPaid,
    0
  );

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
        await readJsonResponse(response);

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
        const currentPackageStillExists =
          loadedPackages.some(
            (studioPackage) =>
              studioPackage.is_active &&
              String(studioPackage.id) ===
                String(current.packageId)
          );

        if (currentPackageStillExists) {
          return current;
        }

        return {
          ...current,
          packageId:
            firstActivePackage?.id || "",
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
        await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not load bookings."
        );
      }

      setBookings(data.bookings || []);
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
  if (!showForm || !form.shootDate) {
    setBookedTimes([]);
    setSlotError("");
    return;
  }

  let isCancelled = false;

  const checkAvailableSlots = async () => {
    try {
      setIsCheckingSlots(true);
      setSlotError("");

      const response = await fetch(
        `/api/available-slots?date=${encodeURIComponent(
          form.shootDate
        )}`
      );

      const data =
        await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not check available times."
        );
      }

      if (!isCancelled) {
        setBookedTimes(
          Array.isArray(data.bookedTimes)
            ? data.bookedTimes
            : []
        );
      }
    } catch (error) {
      console.error(
        "Manual booking availability check failed:",
        error
      );

      if (!isCancelled) {
        setBookedTimes([]);
        setSlotError(error.message);
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
}, [form.shootDate, showForm]);

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((current) => {

if (name === "shootDate") {
  return {
    ...current,
    shootDate: value,
    shootTime: "",
  };
}

      if (name === "paymentStatus") {
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
              String(studioPackage.id) ===
              String(value)
          );

        const nextPrice = Number(
          nextPackage?.default_price || 0
        );

        return {
          ...current,
          packageId: value,
          amountPaid:
            current.paymentStatus === "PAID"
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

  const openManualBookingForm = () => {
    if (!activePackages.length) {
      alert(
        "There are no active packages available. Please enable or create a package first."
      );

      return;
    }

    setForm({
      ...EMPTY_FORM,
      packageId:
        activePackages[0]?.id || "",
    });

    setShowForm(true);
  };

  const closeManualBookingForm = () => {
    setForm({
      ...EMPTY_FORM,
      packageId:
        activePackages[0]?.id || "",
    });

    setShowForm(false);
  };

  const saveManualBooking = async (
    event
  ) => {
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

if (bookedTimes.includes(form.shootTime)) {
  alert(
    "That time is already booked. Please choose another available slot."
  );

  return;
}

    if (
      form.paymentStatus === "PARTIAL" &&
      (
        effectiveAmountPaid <= 0 ||
        effectiveAmountPaid >= packagePrice
      )
    ) {
      alert(
        "For a partial payment, enter an amount greater than ₱0 and lower than the package price."
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
            "x-admin-pin": adminPin,
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
        await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not save manual booking."
        );
      }

      setForm({
        ...EMPTY_FORM,
        packageId:
          activePackages[0]?.id || "",
      });

      setShowForm(false);

      await loadBookings();

      alert(
        "Manual booking saved and added to Google Calendar."
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

const deleteManualBooking = async (booking) => {
  const confirmed = window.confirm(
    `Delete the manual booking for "${booking.client_name}"?\n\nThis will also remove its Google Calendar event and Google Sheet record. This cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeletingBookingId(booking.id);

    const response = await fetch(
      "/api/admin-manual-bookings",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({
          id: booking.id,
        }),
      }
    );

    const data =
      await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not delete the manual booking."
      );
    }

    setBookings((current) =>
      current.filter(
        (item) => item.id !== booking.id
      )
    );

    alert(
      "Manual booking deleted successfully."
    );
  } catch (error) {
    console.error(
      "Manual booking deletion failed:",
      error
    );

    alert(error.message);
  } finally {
    setDeletingBookingId(null);
  }
};

   return (
    <section className="admin-panel">
      <div className="bookings-toolbar">

  {!showForm && (
    <button
      type="button"
      className="admin-btn admin-btn-primary"
      onClick={openManualBookingForm}
      disabled={
        isLoadingPackages ||
        !activePackages.length
      }
    >
      {isLoadingPackages
        ? "Loading Packages..."
        : "+ Add Manual Booking"}
    </button>
  )}
</div>

     {showForm && (
  <div
    className="admin-drawer-overlay"
    onClick={closeManualBookingForm}
  >
    <aside
      className="admin-booking-drawer"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="admin-drawer-header">
        <div>
          <p className="admin-eyebrow">
            New Studio Booking
          </p>

          <h2>Add Manual Booking</h2>
        </div>

        <button
          type="button"
          className="admin-drawer-close"
          onClick={closeManualBookingForm}
          disabled={isSaving}
          aria-label="Close booking form"
        >
          ×
        </button>
      </div>

      <p className="admin-drawer-intro">
        Enter the client, package, schedule, and payment
        details. The selected time will be added to Google
        Calendar.
      </p>

      <form
        className="manual-booking-form"
        onSubmit={saveManualBooking}
      >

          <div className="admin-form-grid">
            <label>
              Client Name
              <input
                name="clientName"
                value={form.clientName}
                onChange={updateForm}
                required
              />
            </label>

            <label>
              Mobile Number
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateForm}
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
                value={form.packageId}
                onChange={updateForm}
                required
              >
                <option value="">
                  Choose package
                </option>

                {activePackages.map(
                  (studioPackage) => (
                    <option
                      key={studioPackage.id}
                      value={studioPackage.id}
                    >
                      {studioPackage.name} — ₱
                      {Number(
                        studioPackage.default_price
                      ).toLocaleString("en-PH")}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Payment Status
              <select
                name="paymentStatus"
                value={form.paymentStatus}
                onChange={updateForm}
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
    value={form.shootDate}
    onChange={updateForm}
    onClick={(event) => {
      try {
        event.currentTarget.showPicker?.();
      } catch (error) {
        console.log("Date picker could not open:", error);
      }
    }}
    required
  />
</label>

            <label>
  Shoot Time

  <select
    name="shootTime"
    value={form.shootTime}
    onChange={updateForm}
    required
    disabled={
      !form.shootDate ||
      isCheckingSlots ||
      Boolean(slotError)
    }
  >
    <option value="">
      {!form.shootDate
        ? "Choose a date first"
        : isCheckingSlots
          ? "Checking available times..."
          : "Choose time"}
    </option>

    {MANUAL_BOOKING_SLOTS.map((slot) => {
      const isBooked =
        bookedTimes.includes(slot.value);

      return (
        <option
          key={slot.value}
          value={slot.value}
          disabled={isBooked}
        >
          {slot.label}
          {isBooked ? " — Booked" : ""}
        </option>
      );
    })}
  </select>

  {slotError && (
    <span className="admin-field-error">
      {slotError}
    </span>
  )}

  {!isCheckingSlots &&
    form.shootDate &&
    !slotError &&
    bookedTimes.length ===
      MANUAL_BOOKING_SLOTS.length && (
      <span className="admin-field-error">
        All studio slots are occupied for this
        date.
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
                onChange={updateForm}
                disabled={
                  form.paymentStatus !==
                  "PARTIAL"
                }
              />
            </label>

            <label>
              Remaining Balance
              <input
                value={`₱${remainingBalance.toLocaleString(
                  "en-PH"
                )}`}
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
              placeholder="Theme, number of people, special requests, payment notes, or other details."
            />
          </label>

          <div className="manual-booking-summary">
            <div>
              <span>Package Price</span>
              <strong>
                ₱
                {packagePrice.toLocaleString(
                  "en-PH"
                )}
              </strong>
            </div>

            <div>
              <span>Amount Paid</span>
              <strong>
                ₱
                {effectiveAmountPaid.toLocaleString(
                  "en-PH"
                )}
              </strong>
            </div>

            <div>
              <span>Remaining Balance</span>
              <strong>
                ₱
                {remainingBalance.toLocaleString(
                  "en-PH"
                )}
              </strong>
            </div>
          </div>

                   <div className="package-form-actions">
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={isSaving || !selectedPackage}
            >
              {isSaving
                ? "Saving..."
                : "Save Manual Booking"}
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={closeManualBookingForm}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  )}

  <div className="manual-booking-list">
        <h3>Manual Bookings</h3>

        {isLoading ? (
          <div className="admin-empty">
            Loading bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div className="admin-empty">
            No manual bookings yet.
          </div>
        ) : (
          <div className="manual-booking-table">
            {bookings.map((booking) => (
              <div
                className="manual-booking-row"
                key={booking.id}
              >
                <div>
                  <strong>
                    {booking.client_name}
                  </strong>

                  <span>
                    {booking.booking_reference}
                  </span>
                </div>

                <div>
                  <strong>
                    {booking.package_title}
                  </strong>

                  <span>
                    ₱
                    {Number(
                      booking.package_price || 0
                    ).toLocaleString(
                      "en-PH"
                    )}{" "}
                    package
                  </span>
                </div>

                <div>
                  <strong>
                    {booking.shoot_date} at{" "}
                    {booking.shoot_time}
                  </strong>

                  <span>
                    {booking.booking_status}
                  </span>
                </div>

                <div>
                  <strong>
  {booking.payment_status === "UNPAID"
    ? "Pay in Studio"
    : booking.payment_status === "PARTIAL"
      ? "Partial Payment"
      : booking.payment_status === "PAID"
        ? "Paid in Full"
        : booking.payment_status}
</strong>

                  <span>
                    Paid ₱
                    {Number(
                      booking.amount_paid || 0
                    ).toLocaleString(
                      "en-PH"
                    )}{" "}
                    / Balance ₱
                    {Number(
                      booking.remaining_balance ||
                        0
                    ).toLocaleString(
                      "en-PH"
                    )}
                  </span>
                </div>
                <div className="manual-booking-actions">
  <button
    type="button"
    className="admin-btn admin-btn-danger"
    onClick={() =>
      deleteManualBooking(booking)
    }
    disabled={
      deletingBookingId === booking.id
    }
  >
    {deletingBookingId === booking.id
      ? "Deleting..."
      : "Delete"}
  </button>
</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default BookingsTab;