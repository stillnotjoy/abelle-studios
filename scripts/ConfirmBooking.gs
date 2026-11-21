/*
 * ABELLE STUDIOS — CONFIRM PENDING WEBSITE BOOKING
 *
 * INSTALLATION
 * 1. In the EXISTING Abelle Studios Apps Script project, create a new
 *    script file named ConfirmBooking (Apps Script adds the .gs suffix).
 * 2. Paste this entire file into ConfirmBooking.gs and save it.
 * 3. Open the existing file that contains function doPost(e).
 * 4. Immediately after its SECRET_TOKEN validation, add:
 *
 *    if (payload.action === "confirm_pending_booking") {
 *      return jsonResponse(
 *        confirmPendingBookingFromApi(payload)
 *      );
 *    }
 *
 * 5. Deploy a NEW VERSION of the existing Web App deployment.
 *
 * IMPORTANT FUTURE-BOOKING FIX
 * In the existing createPendingBooking(payload) function, replace its
 * bookingReference assignment with:
 *
 *   const bookingReference = String(
 *     payload.bookingReference || ""
 *   ).trim() || buildBookingReference({
 *     date: payload.date,
 *     packageTitle: payload.packageTitle,
 *     source: "O",
 *   });
 *
 * This keeps the CRM, Sheet, and Calendar on one reference. The recovery
 * logic below also repairs older pending rows by their Calendar event ID.
 *
 * Do not create a second Apps Script project or a second Web App.
 * This adapter deliberately calls the existing
 * confirmBookingFromSheet(rowNumber) function, which remains responsible
 * for the Sheet, Calendar, and branded confirmation email workflow.
 */

function getConfirmedBookingSnapshot(
  sheet,
  rowNumber,
  reused
) {
  const row = sheet
    .getRange(
      rowNumber,
      1,
      1,
      COL_SMS_REMINDER_2H_SENT
    )
    .getValues()[0];

  return {
    ok: true,
    reused: Boolean(reused),
    bookingReference: String(
      row[COL_BOOKING_REFERENCE - 1] ||
        ""
    ).trim(),
    status: String(
      row[COL_STATUS - 1] || ""
    ).trim(),
    eventId: String(
      row[COL_CALENDAR_EVENT_ID - 1] ||
        ""
    ).trim(),
    amountPaid: Number(
      row[COL_PAID_ONLINE - 1] || 0
    ),
    remainingBalance: Number(
      row[
        COL_REMAINING_BALANCE - 1
      ] || 0
    ),
    emailSent: !reused,
    smsSent:
      String(
        row[
          COL_SMS_CONFIRMATION_SENT - 1
        ] || ""
      ).trim() === "Yes",
    remindersStopped: true,
    confirmedAt:
      new Date().toISOString(),
  };
}

function confirmPendingBookingFromApi(
  payload
) {
  const bookingReference = String(
    payload.bookingReference || ""
  ).trim();

  if (!bookingReference) {
    throw new Error(
      "Booking reference is required."
    );
  }

  if (
    bookingReference.indexOf(
      "ABELLE-MANUAL-"
    ) === 0 ||
    bookingReference.indexOf(
      "AB-M-"
    ) === 0
  ) {
    throw new Error(
      "Manual admin bookings cannot use the public booking confirmation flow."
    );
  }

  const spreadsheet =
    SpreadsheetApp.openById(SHEET_ID);
  const sheet =
    spreadsheet.getSheetByName(
      SHEET_NAME
    );

  if (!sheet) {
    throw new Error(
      `Sheet tab not found: ${SHEET_NAME}`
    );
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    throw new Error(
      "The matching spreadsheet booking row could not be found."
    );
  }

  const bookingRows = sheet
    .getRange(
      2,
      COL_BOOKING_REFERENCE,
      lastRow - 1,
      COL_CALENDAR_EVENT_ID -
        COL_BOOKING_REFERENCE +
        1
    )
    .getDisplayValues();

  let referenceIndex =
    bookingRows.findIndex(
      function (row) {
        return String(
          row[0] || ""
        ).trim() === bookingReference;
      }
    );

  if (referenceIndex < 0) {
    const calendarEventId = String(
      payload.calendarEventId || ""
    ).trim();
    const eventIdColumnOffset =
      COL_CALENDAR_EVENT_ID -
      COL_BOOKING_REFERENCE;

    if (calendarEventId) {
      referenceIndex =
        bookingRows.findIndex(
          function (row) {
            return String(
              row[eventIdColumnOffset] ||
                ""
            ).trim() === calendarEventId;
          }
        );
    }

    if (referenceIndex >= 0) {
      const recoveryRow =
        sheet
          .getRange(
            referenceIndex + 2,
            1,
            1,
            COL_SMS_REMINDER_2H_SENT
          )
          .getValues()[0];
      const sheetEmail = String(
        recoveryRow[COL_EMAIL - 1] || ""
      ).trim().toLowerCase();
      const requestedEmail = String(
        payload.email || ""
      ).trim().toLowerCase();
      const sheetDate = formatSheetDate(
        recoveryRow[COL_SHOOT_DATE - 1]
      );
      const requestedDate = String(
        payload.shootDate || ""
      ).trim();
      const sheetTime = formatSheetTime(
        recoveryRow[COL_SHOOT_TIME - 1]
      );
      const requestedTimeText = String(
        payload.shootTime || ""
      ).trim();
      const requestedTimeMatch =
        requestedTimeText.match(
          /^(\d{1,2}):(\d{2})/
        );
      const requestedTime =
        requestedTimeMatch
          ? String(
              requestedTimeMatch[1]
            ).padStart(2, "0") +
            ":" +
            requestedTimeMatch[2]
          : requestedTimeText;

      if (
        (requestedEmail &&
          sheetEmail !== requestedEmail) ||
        (requestedDate &&
          sheetDate !== requestedDate) ||
        (requestedTime &&
          sheetTime !== requestedTime)
      ) {
        throw new Error(
          "The Calendar hold matched a different spreadsheet booking. Nothing was changed."
        );
      }

      sheet
        .getRange(
          referenceIndex + 2,
          COL_BOOKING_REFERENCE
        )
        .setValue(bookingReference);
    }
  }

  if (referenceIndex < 0) {
    throw new Error(
      "The matching spreadsheet booking row could not be found."
    );
  }

  const rowNumber = referenceIndex + 2;
  const currentStatus = String(
    sheet
      .getRange(
        rowNumber,
        COL_STATUS
      )
      .getDisplayValue() || ""
  ).trim();

  if (
    currentStatus ===
    "PAID / CONFIRMED"
  ) {
    return getConfirmedBookingSnapshot(
      sheet,
      rowNumber,
      true
    );
  }

  if (
    currentStatus !==
    "PENDING DP PAYMENT"
  ) {
    throw new Error(
      "Only a PENDING DP PAYMENT website booking can be confirmed."
    );
  }

  const confirmation =
    confirmBookingFromSheet(rowNumber);

  sheet
    .getRange(
      rowNumber,
      COL_PAYMENT_REMINDER_24H_SENT
    )
    .setValue("Not applicable");
  sheet
    .getRange(
      rowNumber,
      COL_PAYMENT_REMINDER_12H_SENT
    )
    .setValue("Not applicable");

  const confirmedRow = sheet
    .getRange(
      rowNumber,
      1,
      1,
      COL_SMS_REMINDER_2H_SENT
    )
    .getValues()[0];
  const confirmationPayload =
    payloadFromSheetRow(confirmedRow);
  const start = buildStudioDateTime(
    confirmationPayload.date,
    confirmationPayload.time
  );
  let smsSent = false;
  let smsWarning = "";

  if (!confirmationPayload.phone) {
    sheet
      .getRange(
        rowNumber,
        COL_SMS_CONFIRMATION_SENT
      )
      .setValue("No phone");
  } else {
    try {
      sendManualBookingConfirmationSms(
        confirmationPayload,
        bookingReference,
        start
      );
      sheet
        .getRange(
          rowNumber,
          COL_SMS_CONFIRMATION_SENT
        )
        .setValue("Yes");
      smsSent = true;
    } catch (smsError) {
      console.log(
        "Public booking confirmation SMS failed: " +
          smsError.message
      );
      sheet
        .getRange(
          rowNumber,
          COL_SMS_CONFIRMATION_SENT
        )
        .setValue("Failed");
      smsWarning =
        "The booking was confirmed, but the SMS failed: " +
        smsError.message;
    }
  }

  const result =
    getConfirmedBookingSnapshot(
      sheet,
      rowNumber,
      false
    );

  result.eventId =
    confirmation.eventId ||
    result.eventId;
  result.emailSent = true;
  result.smsSent = smsSent;
  result.smsWarning = smsWarning;

  return result;
}
