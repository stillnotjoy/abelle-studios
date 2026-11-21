const CONFIRMABLE_SOURCES = new Set([
  "WEBSITE",
  "PUBLIC_WEBSITE",
  "BOOKING_FORM",
  "STANDALONE_FORM",
  "FORM",
]);

const PENDING_CONFIRMATION_STATUSES = new Set([
  "PENDING",
  "PENDING DP PAYMENT",
]);

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

export function isConfirmablePublicBooking(booking) {
  const bookingReference = normalize(
    booking?.booking_reference
  );
  const bookingSource = normalize(
    booking?.booking_source
  );
  const bookingStatus = normalize(
    booking?.booking_status
  );
  const paymentProvider = normalize(
    booking?.payment_provider
  );
  const paymentOption = normalize(
    booking?.payment_option
  );

  const isManualReference =
    bookingReference.startsWith(
      "ABELLE-MANUAL-"
    ) ||
    bookingReference.startsWith("AB-M-");

  const isPayMongoBooking =
    paymentProvider === "PAYMONGO" ||
    paymentOption.includes("PAYMONGO");

  const hasPublicSource =
    CONFIRMABLE_SOURCES.has(
      bookingSource
    ) ||
    (!bookingSource &&
      bookingReference.startsWith(
        "AB-O-"
      ));

  return Boolean(
    bookingReference &&
      hasPublicSource &&
      !isManualReference &&
      !isPayMongoBooking &&
      PENDING_CONFIRMATION_STATUSES.has(
        bookingStatus
      )
  );
}
