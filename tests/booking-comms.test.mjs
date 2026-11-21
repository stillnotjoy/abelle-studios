import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bookingSource = readFileSync(new URL("../api/admin-manual-bookings.js", import.meta.url), "utf8");
const commsSource = readFileSync(new URL("../api/admin-customer-conversations.js", import.meta.url), "utf8");

function bookingHarness({ calendarStatus = "NOT_REQUIRED", googleFails = false, googleError = "Unauthorized", amountPaid = 500, shootDate = "2020-01-01", shootStatus = "COMPLETED" } = {}) {
  const booking = { id: "test", booking_reference: "test-reference", client_name: "Original",
    shoot_date: shootDate, shoot_time: "09:00", shoot_status: shootStatus,
    post_production_status: "DELIVERED", calendar_status: calendarStatus,
    package_price: 1000, amount_paid: amountPaid, payment_status: "PARTIAL", remaining_balance: 500 };
  const writes = [];
  const googleCalls = [];
  const ledgerEntries = [];
  const source = bookingSource.replace(/import\s+[\s\S]*?from\s+"[^"]+";/g, "")
    .replace("export const config", "const config")
    .replace("export default async function handler", "async function handler");
  const handler = new Function("requireAdmin", "process", "fetch", "recordPaymentTransaction", `${source}; return handler;`)(
    async () => ({ id: "admin" }),
    { env: { SUPABASE_URL: "https://database.test", SUPABASE_SERVICE_ROLE_KEY: "test",
      GOOGLE_APPS_SCRIPT_URL: "https://google.test", GOOGLE_APPS_SCRIPT_SECRET: "test" } },
    async (url, options = {}) => {
      let data;
      if (String(url).startsWith("https://google.test")) {
        googleCalls.push(JSON.parse(options.body));
        data = googleFails ? { ok: false, error: googleError } : { ok: true };
      } else if (String(url).includes("abelle_packages")) {
        data = [{ id: "package", name: "Solo", default_price: 1000, duration_minutes: 40 }];
      } else if (options.method === "PATCH") {
        const update = JSON.parse(options.body);
        writes.push(update);
        data = [{ ...booking, ...update }];
      } else if (options.method === "DELETE") {
        writes.push({ deleted: true });
        data = [booking];
      } else {
        // Honour the selected columns, so a missing historical flag cannot pass unnoticed.
        const columns = new URL(url).searchParams.get("select").split(",");
        data = [Object.fromEntries(Object.entries(booking).filter(([key]) => columns.includes(key)))];
      }
      return { ok: true, text: async () => JSON.stringify(data) };
    },
    async entry => { ledgerEntries.push(entry); return { id: "test-payment" }; },
  );
  return { writes, googleCalls, ledgerEntries, async run(method = "PATCH", overrides = {}) {
    let status;
    let payload;
    await handler({ method, query: {}, body: { action: "update_booking", id: "test",
      clientName: "Corrected", packageId: "package", shootDate: "2020-01-02", shootTime: "10:00",
      ...overrides } }, { status(value) { status = value; return this; }, json(value) { payload = value; } });
    return { status, payload };
  } };
}

test("invalid new-booking email is rejected before Google, database writes or notifications", async () => {
  for (const email of ["test@gmailcom", "test", "test@example.com,other@example.com", "test@example.com\r\nBcc:other@example.com"]) {
    const harness = bookingHarness();
    const result = await harness.run("POST", { action: undefined, email });
    assert.equal(result.status, 400);
    assert.match(result.payload.error, /valid client email/);
    assert.equal(harness.googleCalls.length, 0);
    assert.equal(harness.writes.length, 0);
    assert.equal(harness.ledgerEntries.length, 0);
  }
});

test("completed historical bookings can be corrected without Google or changing workflow/payment history", async () => {
  const harness = bookingHarness();
  const { status, payload } = await harness.run();
  assert.equal(status, 200);
  assert.equal(payload.booking.client_name, "Corrected");
  assert.equal(payload.booking.shoot_date, "2020-01-02");
  assert.equal(payload.booking.shoot_status, "COMPLETED");
  assert.equal(payload.booking.post_production_status, "DELIVERED");
  assert.equal(payload.booking.amount_paid, 500);
  assert.equal(harness.googleCalls.length, 0);
  assert.equal(harness.writes.length, 1);
});

test("past Google-linked bookings are corrected internally without external calls", async () => {
  const harness = bookingHarness({ calendarStatus: "CREATED" });
  assert.equal((await harness.run()).status, 200);
  assert.equal(harness.googleCalls.length, 0);
});

test("Google connection failures cannot block internal corrections", async () => {
  const harness = bookingHarness({ calendarStatus: "CREATED", googleFails: true });
  const { status, payload } = await harness.run();
  assert.equal(status, 200);
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.googleCalls.length, 0);
  assert.equal(payload.booking.client_name, "Corrected");
  assert.equal(payload.notificationsSent, false);
});

test("corrections cannot reduce the total below recorded payments", async () => {
  const harness = bookingHarness({ amountPaid: 1500 });
  assert.equal((await harness.run()).status, 400);
  assert.equal(harness.writes.length, 0);
});

test("a missing spreadsheet row cannot block internal corrections", async () => {
  const harness = bookingHarness({ calendarStatus: "CREATED", googleFails: true,
    googleError: "The matching spreadsheet booking row could not be found." });
  const { status, payload } = await harness.run();
  assert.equal(status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.booking.client_name, "Corrected");
  assert.equal(payload.booking.shoot_date, "2020-01-02");
  assert.equal(harness.writes.length, 1);
  assert.equal(payload.googleSynced, false);
  assert.equal(harness.googleCalls.length, 0);
  assert.equal(payload.internalOnly, true);
  assert.match(payload.message, /No client emails or texts were sent/);
});

test("a future booking and notification flags cannot silently send messages during an edit", async () => {
  const harness = bookingHarness({ calendarStatus: "CREATED", shootDate: "2099-01-01", shootStatus: "SCHEDULED" });
  const { status, payload } = await harness.run("PATCH", { shootDate: "2099-01-02", sendNotifications: true, sendEmail: true, sendSms: true });
  assert.equal(status, 200);
  assert.equal(harness.googleCalls.length, 0);
  assert.equal(payload.notificationsSent, false);
  assert.equal(payload.internalOnly, true);
  assert.equal(payload.booking.shoot_date, "2099-01-02");
});

test("package and price corrections recalculate the balance without contacting clients", async () => {
  const harness = bookingHarness({ calendarStatus: "CREATED" });
  const { status, payload } = await harness.run("PATCH", {
    additionalItems: [{ type: "CUSTOM", name: "Extra portraits", price: 250 }],
  });
  assert.equal(status, 200);
  assert.equal(payload.booking.package_title, "Solo + Extra portraits");
  assert.equal(payload.booking.package_price, 1250);
  assert.equal(payload.booking.amount_paid, 500);
  assert.equal(payload.booking.remaining_balance, 750);
  assert.equal(harness.googleCalls.length, 0);
  assert.equal(payload.notificationsSent, false);
});

test("invalid correction dates are rejected", async () => {
  const harness = bookingHarness();
  assert.equal((await harness.run("PATCH", { shootDate: "2020-02-30" })).status, 400);
  assert.equal(harness.writes.length, 0);
});

test("full payments save booking totals and a revenue entry without Google or client messages", async () => {
  const harness = bookingHarness({ calendarStatus: "CREATED", googleFails: true });
  const { status, payload } = await harness.run("PATCH", {
    action: "record_payment", amountReceived: 500, paymentMethod: "CASH",
    paymentDate: "2026-10-03T12:00:00+08:00",
  });
  assert.equal(status, 200);
  assert.equal(payload.booking.amount_paid, 1000);
  assert.equal(payload.booking.remaining_balance, 0);
  assert.equal(payload.booking.payment_status, "PAID");
  assert.equal(harness.googleCalls.length, 0);
  assert.equal(harness.ledgerEntries.length, 1);
  assert.equal(harness.ledgerEntries[0].amount, 500);
  assert.equal(harness.ledgerEntries[0].source, "MANUAL_PAYMENT");
  assert.equal(payload.notificationsSent, false);
  assert.equal(payload.internalOnly, true);
});

test("partial payments save the correct remaining balance and revenue amount", async () => {
  const harness = bookingHarness({ calendarStatus: "CREATED" });
  const { status, payload } = await harness.run("PATCH", {
    action: "record_payment", amountReceived: 200, paymentMethod: "CASH",
  });
  assert.equal(status, 200);
  assert.equal(payload.booking.amount_paid, 700);
  assert.equal(payload.booking.remaining_balance, 300);
  assert.equal(payload.booking.payment_status, "PARTIAL");
  assert.equal(harness.ledgerEntries[0].amount, 200);
  assert.equal(harness.googleCalls.length, 0);
});

test("overpayments cannot change balances or create revenue entries", async () => {
  const harness = bookingHarness();
  const { status } = await harness.run("PATCH", { action: "record_payment", amountReceived: 501 });
  assert.equal(status, 400);
  assert.equal(harness.writes.length, 0);
  assert.equal(harness.ledgerEntries.length, 0);
});

test("historical booking deletion does not call Google", async () => {
  const harness = bookingHarness();
  assert.equal((await harness.run("DELETE")).status, 200);
  assert.equal(harness.googleCalls.length, 0);
  assert.deepEqual(harness.writes, [{ deleted: true }]);
});

for (const [name, next, operation] of [
  ["deleteManualBookingRecords", "async function getCustomerDirectoryBookings", "deleted"],
]) {
  const source = bookingSource.slice(bookingSource.indexOf(`async function ${name}`), bookingSource.indexOf(next));
  test(`${name} explains rejected Google credentials`, async () => {
    const invoke = new Function("fetch", "process", "APPS_SCRIPT_REQUEST_HEADERS", "cleanText", `${source}; return ${name};`)(
      async () => ({ ok: true, text: async () => JSON.stringify({ ok: false, error: "Unauthorized" }) }),
      { env: { GOOGLE_APPS_SCRIPT_URL: "https://example.test", GOOGLE_APPS_SCRIPT_SECRET: "test" } },
      {}, value => String(value || "").trim(),
    );
    await assert.rejects(invoke({ booking_reference: "test" }), error => {
      assert.match(error.message, /connection credentials/);
      assert.match(error.message, new RegExp(`not ${operation}`));
      return true;
    });
  });
  test("deletion rejects availability responses and mismatched booking confirmations", async () => {
    for (const response of [{ok:true,bookedTimes:[]}, {ok:true,bookingReference:"another",calendarDeleted:true,sheetRowsDeleted:1}]) {
      const invoke = new Function("fetch", "process", "APPS_SCRIPT_REQUEST_HEADERS", "cleanText", `${source}; return ${name};`)(
        async () => ({ok:true,text:async()=>JSON.stringify(response)}),
        {env:{GOOGLE_APPS_SCRIPT_URL:"https://example.test",GOOGLE_APPS_SCRIPT_SECRET:"test"}}, {}, value=>String(value||"").trim(),
      );
      await assert.rejects(invoke({booking_reference:"test"}), /valid deletion confirmation/);
    }
  });
  test("verified deletion uses the configured credentials and exact saved reference", async () => {
    let payload;
    const confirmation = {ok:true,bookingReference:"test",calendarDeleted:true,sheetRowsDeleted:1};
    const invoke = new Function("fetch", "process", "APPS_SCRIPT_REQUEST_HEADERS", "cleanText", `${source}; return ${name};`)(
      async (_url, options) => { payload=JSON.parse(options.body); return {ok:true,text:async()=>JSON.stringify(confirmation)}; },
      {env:{GOOGLE_APPS_SCRIPT_URL:"https://example.test",GOOGLE_APPS_SCRIPT_SECRET:"test"}}, {}, value=>String(value||"").trim(),
    );
    assert.deepEqual(await invoke({booking_reference:"test",calendar_event_id:"event"}),confirmation);
    assert.deepEqual(payload,{secret:"test",action:"delete_manual_booking",bookingReference:"test",calendarEventId:"event"});
  });
}

const commsHandlerSource = commsSource.slice(commsSource.indexOf("async function handleConversationFetch"), commsSource.indexOf("async function handleCustomerEventLog"));

for (const failure of ["Unauthorized", "TimeoutError"]) {
  test(`comms preserves saved history and warns on ${failure}`, async () => {
    let timeoutSignal;
    const query = {
      select() { return this; }, order() { return this; }, limit() { return this; },
      eq() { return this; }, or() { return this; },
      then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
    };
    const handler = new Function("fetch", "getSupabaseClient", `
      const GOOGLE_APPS_SCRIPT_URL = "https://example.test";
      const GOOGLE_APPS_SCRIPT_SECRET = "test";
      const APPS_SCRIPT_REQUEST_HEADERS = {};
      const normalizePhone = value => value;
      const normalizeSupabaseConversation = value => value;
      const normalizeActivity = value => value;
      const sortByDateAscending = value => value;
      const sortByDateDescending = value => value;
      ${commsHandlerSource}; return handleConversationFetch;
    `)(async (_url, options) => {
      timeoutSignal = options.signal;
      if (failure === "TimeoutError") throw Object.assign(new Error("timeout"), { name: failure });
      return { ok: true, json: async () => ({ ok: false, error: failure }) };
    }, () => ({ from: () => query }));
    let status;
    let payload;
    await handler({ query: { phone: "09170000000" } }, {
      status(value) { status = value; return this; },
      json(value) { payload = value; },
    });
    assert.equal(status, 200);
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.messages, []);
    assert.ok(timeoutSignal instanceof AbortSignal);
    assert.match(payload.warning, failure === "Unauthorized" ? /credentials were rejected/ : /timed out/);
  });
}
