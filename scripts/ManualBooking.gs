function createManualBooking(payload) {
  payload.email = String(payload.email || "").trim();
  if (payload.email && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(payload.email)) {
    throw new Error("Enter a valid client email address, for example name@gmail.com. Nothing was created or sent.");
  }
  const notificationWarnings = [];
  let staffEmailSent = false;
  let clientEmailSent = false;
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);

  if (!calendar) {
    throw new Error("Calendar not found.");
  }

  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet tab not found: ${SHEET_NAME}`);
  }

  const bookingReference =
    payload.bookingReference ||
    buildBookingReference({
      date: payload.date,
      time: payload.time,
    });

  // Returning an existing reference must never repeat notifications.
  if (sheet.getLastRow() >= 2) {
    const references = sheet.getRange(2, COL_BOOKING_REFERENCE, sheet.getLastRow() - 1, 1).getDisplayValues();
    const existingIndex = references.findIndex(row => String(row[0] || "").trim() === bookingReference);
    if (existingIndex >= 0) {
      return { ok: true, bookingReference, eventId: String(sheet.getRange(existingIndex + 2, COL_CALENDAR_EVENT_ID).getValue() || ""), reused: true, notificationsSkipped: true, message: "Existing booking recovered; no notifications resent." };
    }
  }
  const packagePrice = Number(payload.packagePrice || 0);
  const amountPaid = Number(payload.amountPaid || 0);
  const remainingBalance = Number(payload.remainingBalance || 0);
  const paymentStatus = payload.paymentStatus || "UNPAID";

  const slot = getManualBookingWindow(
    calendar,
    payload.date,
    payload.time,
    payload.durationMinutes,
    ""
  );

  const start = slot.start;
  const end = slot.end;

  const title = `${bookingReference} - MANUAL BOOKING - ${payload.packageTitle} - ${payload.name}`;

  const description = `
Abelle Studios Manual Booking

Booking Reference: ${bookingReference}

Client: ${payload.name}
Email: ${payload.email || ""}
Phone: ${payload.phone || ""}

Package: ${payload.packageTitle}
Date: ${payload.date}
Time: ${payload.time}

Payment Status: ${paymentStatus}
Amount Paid: ₱${amountPaid}
Remaining Balance: ₱${remainingBalance}

Notes:
${payload.notes || "None"}
`;

  const event = calendar.createEvent(title, start, end, {
    description,
    location: STUDIO_ADDRESS,
  });

  sheet.appendRow([
    new Date(),
    bookingReference,
    "MANUAL / CONFIRMED",
    payload.name || "",
    payload.email || "",
    payload.phone || "",
    payload.packageTitle || "",
    payload.date || "",
    payload.time || "",
    packagePrice,
    amountPaid,
    0,
    amountPaid,
    remainingBalance,
    "Manual Admin Booking",
    "",
    "",
    event.getId(),
    payload.notes || "",
    "",
    "Upcoming",
    remainingBalance > 0 ? "Unpaid Balance" : "Fully Paid",
    "Not Yet Sent",
    `Manual booking created from admin. Payment status: ${paymentStatus}.`,
  ]);

  const manualBookingRow =
    sheet.getLastRow();

  const hoursUntilShoot =
    (
      start.getTime() -
      new Date().getTime()
    ) /
    (1000 * 60 * 60);

  if (!payload.phone) {
    sheet
      .getRange(
        manualBookingRow,
        COL_SMS_CONFIRMATION_SENT
      )
      .setValue("No phone");

    sheet
      .getRange(
        manualBookingRow,
        COL_SMS_REMINDER_24H_SENT
      )
      .setValue("No phone");

    sheet
      .getRange(
        manualBookingRow,
        COL_SMS_REMINDER_2H_SENT
      )
      .setValue("No phone");
  } else {
    try {
      sendManualBookingConfirmationSms(
        payload,
        bookingReference,
        start
      );

      sheet
        .getRange(
          manualBookingRow,
          COL_SMS_CONFIRMATION_SENT
        )
        .setValue("Yes");
    } catch (smsError) {
      console.log(
        `Manual booking confirmation SMS failed: ${smsError.message}`
      );

      sheet
        .getRange(
          manualBookingRow,
          COL_SMS_CONFIRMATION_SENT
        )
        .setValue("Failed");
    }

    /*
     * Prevent an immediate confirmation
     * and a near-identical reminder from
     * being sent back-to-back.
     */
    if (hoursUntilShoot <= 24) {
      sheet
        .getRange(
          manualBookingRow,
          COL_SMS_REMINDER_24H_SENT
        )
        .setValue("Not applicable");
    }

    if (hoursUntilShoot <= 2) {
      sheet
        .getRange(
          manualBookingRow,
          COL_SMS_REMINDER_2H_SENT
        )
        .setValue("Not applicable");
    }
  }


  try {
  GmailApp.sendEmail(
    NOTIFICATION_EMAIL,
    `Manual booking added - ${bookingReference}`,
    `
Manual booking created from the Abelle Studios admin dashboard.

Booking Reference: ${bookingReference}

Client: ${payload.name}
Email: ${payload.email || ""}
Phone: ${payload.phone || ""}

Package: ${payload.packageTitle}
Date: ${payload.date}
Time: ${payload.time}

Payment Status: ${paymentStatus}
Amount Paid: ₱${amountPaid}
Remaining Balance: ₱${remainingBalance}

Google Calendar Event ID:
${event.getId()}

Notes:
${payload.notes || "None"}
    `,
    {
      from: FROM_EMAIL,
      name: FROM_NAME,
    }
  );

    staffEmailSent = true;
  } catch (error) {
    notificationWarnings.push("Staff email failed: " + error.message);
  }

  try {
if (payload.email) {
  if (paymentStatus === "PAID") {
    sendClientConfirmationEmail(
      {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        packageTitle: payload.packageTitle,
        packagePrice: packagePrice,
        totalToPayNow: amountPaid,
        remainingBalance: remainingBalance,
        date: payload.date,
        time: payload.time,
        notes: payload.notes || "",
      },
      bookingReference,
      start,
      end
    );
  } else {
    sendManualBookingPaymentEmail(
      {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        packageTitle: payload.packageTitle,
        packagePrice: packagePrice,
        date: payload.date,
        time: payload.time,
        notes: payload.notes || "",
      },
      bookingReference,
      amountPaid,
      remainingBalance,
      paymentStatus
    );
  }
}

    clientEmailSent = Boolean(payload.email);
  } catch (error) {
    notificationWarnings.push("Client email failed: " + error.message);
  }

  return {
    ok: true,
    bookingReference,
    eventId: event.getId(),
    staffEmailSent, clientEmailSent, notificationWarnings,
    message: "Manual booking created in calendar and sheet.",
  };
}
