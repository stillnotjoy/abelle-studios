export default function BookingForm({
  bookingForm,
  bookingPackages,
  selectedBookingPackage,
  updateBookingForm,
  bookingSlots,
  isCheckingSlots,
  availableSlots,
  setBookingForm,
  paymentOption,
  setPaymentOption,
  discountCode,
  setDiscountCode,
  validatedDiscount,
  setValidatedDiscount,
  discountMessage,
  setDiscountMessage,
  isCheckingDiscount,
  checkDiscountCode,
  paymentSummary,
  submitBookingPreview,
  selectedPackagePrice,
  selectedPackageDeposit,
}) {
  return (
    <>
      <p className="drawer-intro">
        Choose your package, preferred date, and available time. Your
        selected slot will be secured once the required payment has been
        received.
      </p>

      <form className="drawer-form" onSubmit={submitBookingPreview}>
        <label>
          <span>Package</span>
          <select
            name="packageId"
            value={bookingForm.packageId}
            onChange={updateBookingForm}
            required
          >
            {bookingPackages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.title} - {pkg.price}
              </option>
            ))}
          </select>
        </label>

        <div className="drawer-selected-package">
          <strong>{selectedBookingPackage.title}</strong>
          <p>{selectedBookingPackage.desc}</p>
          <span>{selectedBookingPackage.price}</span>
        </div>

        <div className="drawer-two-col">
          <label>
            <span>Preferred date</span>
            <input
              type="date"
              name="date"
              value={bookingForm.date}
              onChange={updateBookingForm}
              required
            />
          </label>

          <label>
            <span>Selected time</span>
            <input
              type="text"
              value={
                bookingForm.time
                  ? bookingSlots.find(
                      (slot) => slot.value === bookingForm.time
                    )?.label
                  : "Choose below"
              }
              readOnly
            />
          </label>
        </div>

        {bookingForm.date && (
          <div className="drawer-slot-picker">
            <span>Available times</span>

            {isCheckingSlots ? (
              <p className="drawer-small-note">Checking available times...</p>
            ) : availableSlots.length > 0 ? (
              <div className="drawer-slot-grid">
                {availableSlots.map((slot) => (
                  <button
                    type="button"
                    key={slot.value}
                    className={
                      bookingForm.time === slot.value
                        ? "drawer-slot active"
                        : "drawer-slot"
                    }
                    onClick={() =>
                      setBookingForm((current) => ({
                        ...current,
                        time: slot.value,
                      }))
                    }
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="drawer-small-note">
                Sorry, all slots are booked for this date. Please choose
                another date.
              </p>
            )}
          </div>
        )}

        <label>
          <span>Full name</span>
          <input
            type="text"
            name="name"
            value={bookingForm.name}
            onChange={updateBookingForm}
            required
          />
        </label>

        <div className="drawer-two-col">
          <label>
            <span>Mobile number</span>
            <input
              type="tel"
              name="phone"
              value={bookingForm.phone}
              onChange={updateBookingForm}
              required
            />
          </label>

          <label>
            <span>Email address</span>
            <input
              type="email"
              name="email"
              value={bookingForm.email}
              onChange={updateBookingForm}
              required
            />
          </label>
        </div>

        <label>
          <span>Notes / theme / special request</span>
          <textarea
            name="notes"
            value={bookingForm.notes}
            onChange={updateBookingForm}
            placeholder="Tell us about your shoot idea, number of people, or preferred setup."
          />
        </label>

        <div className="drawer-field">
          <span className="drawer-field-title">Choose your payment option</span>

          <div className="payment-options">
            <label
              className={
                paymentOption === "full_online"
                  ? "payment-option-card active"
                  : "payment-option-card"
              }
            >
              <input
                type="radio"
                name="paymentOption"
                value="full_online"
                checked={paymentOption === "full_online"}
                onChange={(event) => setPaymentOption(event.target.value)}
              />
              <span>
                <strong>
                  Pay in full online — QR Ph or Card
                </strong>
                <small>
                  Choose QR Ph or Visa/Mastercard on PayMongo. Card
                  payments may require 3D Secure authentication. Online
                  processing fees are added at checkout, and your booking
                  is confirmed automatically after payment.
                </small>
              </span>
            </label>

            <label
              className={
                paymentOption === "dp_gcash_balance_instudio"
                  ? "payment-option-card active"
                  : "payment-option-card"
              }
            >
              <input
                type="radio"
                name="paymentOption"
                value="dp_gcash_balance_instudio"
                checked={paymentOption === "dp_gcash_balance_instudio"}
                onChange={(event) => setPaymentOption(event.target.value)}
              />
              <span>
                <strong>Pay deposit via GCash</strong>
<small>
  Pay ₱{selectedPackageDeposit.toLocaleString()} via GCash
  to secure your booking. Your selected slot will be held
  for 2 hours from the time you submit this request. If we
  do not receive your payment proof within 2 hours, the hold
  will automatically expire and the slot may become available
  to another client.
</small>
              </span>
            </label>
          </div>

        {paymentOption === "full_online" && (
  <div className="discount-code-box">
    <label htmlFor="discountCode">Discount Code</label>
    <input
      id="discountCode"
      type="text"
      value={discountCode}
      onChange={(event) => {
        setDiscountCode(event.target.value);
        setValidatedDiscount(null);
        setDiscountMessage("");
      }}
      placeholder="Enter discount code"
    />

    <div className="discount-code-actions">
      <button
        type="button"
        className="discount-check-btn"
        onClick={checkDiscountCode}
        disabled={isCheckingDiscount || !discountCode.trim()}
      >
        {isCheckingDiscount ? "Checking..." : "Apply Code"}
      </button>
    </div>

    {discountMessage && (
      <p className={validatedDiscount ? "discount-valid" : "discount-invalid"}>
        {discountMessage}
      </p>
    )}
  </div>
)}
        </div>

        <div className="drawer-payment-preview">
          <div>
            <span>Package price</span>
            <strong>₱{selectedPackagePrice.toLocaleString()}</strong>
          </div>

          {paymentSummary.discountAmount > 0 && (
            <div>
              <span>Discount applied</span>
              <strong>-₱{paymentSummary.discountAmount.toLocaleString()}</strong>
            </div>
          )}

          <div>
            <span>Payment method</span>
            <strong>
              {paymentOption === "full_online"
                ? "PayMongo — QR Ph or Card"
: "GCash deposit"}                  </strong>
          </div>

          <div className="drawer-payment-total">
            <span>
              {paymentOption === "full_online"
                ? "Full payment now"
: "Deposit due now"}                  </span>
            <strong>₱{paymentSummary.amountDueToday.toLocaleString()}</strong>
          </div>

          <div>
            <span>Remaining balance</span>
            <strong>₱{paymentSummary.remainingBalance.toLocaleString()}</strong>
          </div>
        </div>

        <button className="btn btn-dark full" disabled={!bookingForm.time}>
          {paymentOption === "full_online"
            ? "Continue to PayMongo Checkout"
            : "Submit Booking Request"}
        </button>

        <p className="drawer-small-note">
          {paymentOption === "full_online"
            ? "You will be redirected to PayMongo to choose QR Ph or Card. Card authentication is handled securely by PayMongo. Online processing fees are added at checkout."
            : "We’ll email the GCash payment details after receiving your request. Your selected slot will be held for 2 hours only. Please pay the required deposit and send your proof of payment through Messenger before the hold expires."}
        </p>
      </form>
    </>
  );
}
