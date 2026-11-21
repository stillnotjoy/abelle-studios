import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

import { isConfirmablePublicBooking } from "../lib/booking-confirmation.js";

const pendingWebsiteBooking = {
  booking_reference: "AB-O-S-261121-1234",
  booking_source: "WEBSITE",
  booking_status: "PENDING",
  payment_provider: "GCASH",
  payment_option: "dp_gcash_balance_instudio",
};

test("pending public GCash bookings are confirmable", () => {
  assert.equal(
    isConfirmablePublicBooking(
      pendingWebsiteBooking
    ),
    true
  );
});

test("manual admin bookings are never confirmable", () => {
  assert.equal(
    isConfirmablePublicBooking({
      ...pendingWebsiteBooking,
      booking_reference:
        "AB-M-S-261121-1234",
      booking_source: "",
      payment_option: "MANUAL_ADMIN",
    }),
    false
  );
});

test("PayMongo and already confirmed bookings are not confirmable", () => {
  assert.equal(
    isConfirmablePublicBooking({
      ...pendingWebsiteBooking,
      payment_provider: "PAYMONGO",
    }),
    false
  );
  assert.equal(
    isConfirmablePublicBooking({
      ...pendingWebsiteBooking,
      booking_status:
        "PAID / CONFIRMED",
    }),
    false
  );
  assert.equal(
    isConfirmablePublicBooking({
      ...pendingWebsiteBooking,
      booking_status: "CONFIRMED",
    }),
    false
  );
});

test("legacy online references remain eligible without a source field", () => {
  assert.equal(
    isConfirmablePublicBooking({
      ...pendingWebsiteBooking,
      booking_source: "",
      booking_status:
        "PENDING DP PAYMENT",
    }),
    true
  );
});

function createAppsScriptHarness({
  status = "PENDING DP PAYMENT",
  bookingReference =
    "AB-O-S-261121-1234",
  sheetBookingReference =
    bookingReference,
} = {}) {
  const source = readFileSync(
    new URL(
      "../scripts/ConfirmBooking.gs",
      import.meta.url
    ),
    "utf8"
  );
  const row = Array(29).fill("");
  row[1] = sheetBookingReference;
  row[2] = status;
  row[3] = "Test Client";
  row[4] = "client@example.test";
  row[5] = "09171234567";
  row[6] = "Solo";
  row[7] = "2026-12-01";
  row[8] = "10:00";
  row[10] = 250;
  row[13] = 249;
  row[17] = "event-hold";
  const calls = {
    confirm: 0,
    sms: 0,
  };

  const sheet = {
    getLastRow: () => 2,
    getRange(
      rowNumber,
      column,
      rowCount = 1,
      columnCount = 1
    ) {
      assert.equal(rowNumber, 2);
      return {
        getDisplayValues() {
          if (
            column === 2 &&
            columnCount === 1
          ) {
            return [[row[1]]];
          }
          return [
            row.slice(
              column - 1,
              column - 1 +
                columnCount
            ),
          ];
        },
        getDisplayValue() {
          return String(
            row[column - 1] || ""
          );
        },
        getValues() {
          return [
            row.slice(
              column - 1,
              column - 1 +
                columnCount
            ),
          ];
        },
        setValue(value) {
          row[column - 1] = value;
          return this;
        },
      };
    },
  };

  const context = vm.createContext({
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => sheet,
      }),
    },
    SHEET_ID: "sheet",
    SHEET_NAME: "Bookings / Sales",
    COL_BOOKING_REFERENCE: 2,
    COL_STATUS: 3,
    COL_EMAIL: 5,
    COL_SHOOT_DATE: 8,
    COL_SHOOT_TIME: 9,
    COL_PAID_ONLINE: 11,
    COL_REMAINING_BALANCE: 14,
    COL_CALENDAR_EVENT_ID: 18,
    COL_REMARKS: 24,
    COL_PAYMENT_REMINDER_24H_SENT: 25,
    COL_PAYMENT_REMINDER_12H_SENT: 26,
    COL_SMS_CONFIRMATION_SENT: 27,
    COL_SMS_REMINDER_2H_SENT: 29,
    payloadFromSheetRow: () => ({
      name: "Test Client",
      phone: "09171234567",
      packageTitle: "Solo",
      date: "2026-12-01",
      time: "10:00",
    }),
    buildStudioDateTime: () =>
      new Date(
        "2026-12-01T10:00:00+08:00"
      ),
    formatSheetDate: (value) =>
      String(value || ""),
    formatSheetTime: (value) =>
      String(value || "").slice(0, 5),
    confirmBookingFromSheet: () => {
      calls.confirm += 1;
      row[2] = "PAID / CONFIRMED";
      row[17] = "event-confirmed";
      return {
        ok: true,
        bookingReference,
        eventId: "event-confirmed",
      };
    },
    sendManualBookingConfirmationSms: () => {
      calls.sms += 1;
    },
    console,
  });

  vm.runInContext(source, context);

  return {
    calls,
    row,
    run: () =>
      context.confirmPendingBookingFromApi({
        bookingReference,
        calendarEventId: "event-hold",
        email: "client@example.test",
        shootDate: "2026-12-01",
        shootTime: "10:00:00",
      }),
  };
}

test("Apps Script adapter confirms once and stops reminders", () => {
  const harness =
    createAppsScriptHarness();
  const result = harness.run();

  assert.equal(result.ok, true);
  assert.equal(
    result.status,
    "PAID / CONFIRMED"
  );
  assert.equal(
    result.eventId,
    "event-confirmed"
  );
  assert.equal(result.smsSent, true);
  assert.equal(result.emailSent, true);
  assert.equal(
    result.remindersStopped,
    true
  );
  assert.deepEqual(harness.calls, {
    confirm: 1,
    sms: 1,
  });
  assert.equal(
    harness.row[24],
    "Not applicable"
  );
  assert.equal(
    harness.row[25],
    "Not applicable"
  );
  assert.equal(harness.row[26], "Yes");
});

test("Apps Script adapter reuses a confirmed row without duplicate messages", () => {
  const harness =
    createAppsScriptHarness({
      status: "PAID / CONFIRMED",
    });
  const result = harness.run();

  assert.equal(result.reused, true);
  assert.deepEqual(harness.calls, {
    confirm: 0,
    sms: 0,
  });
});

test("Apps Script adapter repairs a mismatched legacy reference through the exact Calendar hold", () => {
  const harness =
    createAppsScriptHarness({
      bookingReference:
        "AB-O-S-261128-6910",
      sheetBookingReference:
        "AB-O-S-261128-4455",
    });
  const result = harness.run();

  assert.equal(result.ok, true);
  assert.equal(
    harness.row[1],
    "AB-O-S-261128-6910"
  );
  assert.deepEqual(harness.calls, {
    confirm: 1,
    sms: 1,
  });
});

test("Apps Script adapter rejects manual booking references", () => {
  const harness =
    createAppsScriptHarness({
      bookingReference:
        "AB-M-S-261121-1234",
    });

  assert.throws(
    () => harness.run(),
    /Manual admin bookings/
  );
  assert.deepEqual(harness.calls, {
    confirm: 0,
    sms: 0,
  });
});
