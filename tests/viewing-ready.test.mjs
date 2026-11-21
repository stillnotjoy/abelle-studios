/* global process */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { buildViewingMessage, notifyViewingReady } from "../server/viewingReady.js";

const gs = readFileSync(new URL("../scripts/ViewingReady.gs", import.meta.url), "utf8");
const booking = { id: "test", booking_reference: "AB-test", client_name: "Jane <script>", email: "client@example.test",
  phone: "09171234567", client_drive_folder_id: "folder123", client_drive_folder_url: "https://drive.google.com/drive/folders/folder123" };
const payload = { bookingId: booking.id, bookingReference: booking.booking_reference, name: booking.client_name,
  email: booking.email, phone: booking.phone, folderId: booking.client_drive_folder_id,
  folderUrl: booking.client_drive_folder_url, ...buildViewingMessage(booking) };

function scriptHarness({ smsFailure = false, smsUnknown = false, empty = false, sharingFails = false, aliasMissing = false, existingRole } = {}) {
  const values = { VIEWING_READY_PHILSMS_TOKEN: "test", VIEWING_READY_PHILSMS_SENDER: "Abelle" };
  const emails = [];
  const texts = [];
  const shares = [];
  const context = vm.createContext({
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => values[key], setProperty: (key, value) => { values[key] = value; } }) },
    DriveApp: { getFolderById: () => ({ getFiles: () => ({ hasNext: () => !empty }), getFolders: () => ({ hasNext: () => false }) }) },
    MailApp: { getRemainingDailyQuota: () => 10, sendEmail: email => emails.push(email) },
    GmailApp: { getAliases: () => aliasMissing ? [] : ["hello@abellestudios.xyz"], sendEmail: (to, subject, body, options) => emails.push({to, subject, body, ...options}) },
    Utilities: { formatDate: date => date.toISOString().slice(0, 10) },
    ScriptApp: { getOAuthToken: () => "test" },
    Drive: { Permissions: {
      list: () => { if (sharingFails) throw new Error("sharing failed"); return { permissions: existingRole ? [{id: "client-permission", emailAddress: booking.email, role: existingRole}] : [] }; },
      create: (permission, folderId, options) => shares.push({ permission, folderId, options }),
      update: (permission, folderId, id, options) => shares.push({ permission, folderId, id, options }),
    } },
    UrlFetchApp: { fetch: (url, options) => {
      if (url.includes("philsms.com")) {
        texts.push(JSON.parse(options.payload));
        if (smsUnknown) throw new Error("connection lost");
        return { getResponseCode: () => smsFailure ? 400 : 200,
          getContentText: () => JSON.stringify({ status: smsFailure ? "error" : "success" }) };
      }
      shares.push({ url, options });
      return { getResponseCode: () => sharingFails ? 403 : 200,
        getContentText: () => JSON.stringify({ permissions: [] }) };
    } },
  });
  vm.runInContext(gs, context);
  return { values, emails, texts, shares, run: (p = payload) => context.notifyViewingReady_(p) };
}

test("email escapes client data and includes the folder and 30-day storage policy", () => {
  const message = buildViewingMessage(booking);
  assert.ok(!message.html.includes("Jane <script>"));
  assert.ok(message.html.includes("Jane &lt;script&gt;"));
  assert.ok(message.html.includes(booking.client_drive_folder_url));
  assert.match(message.body, /30 days/);
  assert.match(message.body, /99 per month/);
  assert.match(message.body, /no automatic charge/i);
  assert.match(message.body, /do not rename the shared folder/i);
  assert.match(message.html, /keep the shared folder name unchanged/i);
  assert.match(message.body, /viewer permission/i);
  assert.match(message.sms, /check your email/);
});

test("existing client editor permissions are reduced to Viewer on delivery", () => {
  const h = scriptHarness({existingRole: "writer"});
  assert.equal(h.run().ok, true);
  assert.equal(h.shares[0].permission.role, "reader");
  assert.equal(h.shares[0].id, "client-permission");
});

test("client owner permissions cannot be claimed as Viewer or trigger notifications", () => {
  const h = scriptHarness({existingRole: "owner"});
  assert.equal(h.run().ok, false);
  assert.equal(h.emails.length, 0);
  assert.equal(h.texts.length, 0);
});

test("uninstalled legacy Apps Script never receives an unknown POST action", async () => {
  const calls = [];
  process.env.GOOGLE_APPS_SCRIPT_URL = "https://example.test/exec";
  process.env.GOOGLE_APPS_SCRIPT_SECRET = "test";
  await assert.rejects(notifyViewingReady(booking, async (_url, options) => {
    calls.push(options); return { ok: true, json: async () => ({ ok: false, error: "Missing date" }) };
  }), /Install and redeploy/);
  assert.equal(calls.length, 1);
  assert.notEqual(calls[0].method, "POST");
});

test("successful delivery grants viewer access, sends both channels and never duplicates on retry", () => {
  const h = scriptHarness();
  const first = h.run();
  assert.equal(first.ok, true);
  assert.equal(h.emails[0].to, booking.email);
  assert.equal(h.emails[0].from, "hello@abellestudios.xyz");
  assert.equal(h.emails[0].replyTo, "hello@abellestudios.xyz");
  assert.equal(h.texts[0].recipient, "639171234567");
  assert.equal(h.shares[0].options.sendNotificationEmail, false);
  assert.equal(h.shares[0].permission.role, "reader");
  assert.ok(!h.emails[0].htmlBody.includes("{{FREE_UNTIL}}"));
  assert.equal((Date.parse(first.freeUntil) - Date.parse(first.deliveredAt)) / 86400000, 30);
  assert.equal(h.run().ok, true);
  assert.equal(h.emails.length, 1);
  assert.equal(h.texts.length, 1);
});

test("an unavailable hello alias blocks viewing notifications before sharing or sending", () => {
  const h = scriptHarness({aliasMissing:true});
  const result = h.run();
  assert.equal(result.ok, false);
  assert.match(result.error, /verified Gmail/);
  assert.equal(h.emails.length, 0);
  assert.equal(h.texts.length, 0);
  assert.equal(h.shares.length, 0);
});

test("an explicit SMS rejection may retry SMS without repeating the successful email", () => {
  const h = scriptHarness({ smsFailure: true });
  assert.equal(h.run().ok, false);
  assert.equal(h.run().ok, false);
  assert.equal(h.emails.length, 1);
  assert.equal(h.texts.length, 2);
});

test("an ambiguous send outcome blocks repeated sends", () => {
  const h = scriptHarness({ smsUnknown: true });
  assert.equal(h.run().ok, false);
  assert.match(h.run().error, /uncertain outcome/);
  assert.equal(h.emails.length, 1);
  assert.equal(h.texts.length, 1);
});

test("empty folders and sharing failures cannot notify clients", () => {
  for (const options of [{ empty: true }, { sharingFails: true }]) {
    const h = scriptHarness(options);
    assert.equal(h.run().ok, false);
    assert.equal(h.emails.length, 0);
    assert.equal(h.texts.length, 0);
  }
});

test("changing recipients after delivery does not trigger new messages", () => {
  const h = scriptHarness();
  h.run();
  assert.equal(h.run({ ...payload, email: "other@example.test" }).ok, false);
  assert.equal(h.emails.length, 1);
  assert.equal(h.texts.length, 1);
});

test("a partial installation cannot advertise a working notification route", () => {
  const context = vm.createContext({});
  vm.runInContext(gs, context);
  assert.equal(context.viewingReadyCapabilities_().ok, false);
  vm.runInContext('function doPost(e) { var payload = e; return notifyViewingReady_(payload); }', context);
  assert.equal(context.viewingReadyCapabilities_().viewingReadyVersion, 1);
});

const endpointSource = readFileSync(new URL("../server/viewingReadyHandler.js", import.meta.url), "utf8")
  .replace(/import\s+[^;]+;/g, "").replace("export const config", "const config")
  .replace("export default async function handler", "async function handler");

function endpointHarness(savedBooking = { ...booking, shoot_status: "COMPLETED", post_production_status: "READY_FOR_DELIVERY" }) {
  const sends = [];
  const writes = [];
  const handler = new Function("requireAdmin", "notifyViewingReady", "process", "fetch", `${endpointSource}; return handler;`)(
    async () => ({ id: "admin" }), async data => { sends.push(data); return { deliveredAt: "2026-10-03T12:00:00Z" }; },
    { env: { SUPABASE_URL: "https://database.test", SUPABASE_SERVICE_ROLE_KEY: "test" } },
    async (_url, options) => {
      if (options.method === "PATCH") writes.push(JSON.parse(options.body));
      return { ok: true, json: async () => [savedBooking] };
    },
  );
  return { sends, writes, async run(body) {
    let status;
    let result;
    await handler({ method: "POST", body }, { status(value) { status = value; return this; }, json(value) { result = value; } });
    return { status, result };
  } };
}

test("endpoint requires staff upload confirmation and completed editing", async () => {
  const h = endpointHarness();
  assert.equal((await h.run({ id: "test" })).status, 400);
  assert.equal(h.sends.length, 0);
  const editing = endpointHarness({ ...booking, shoot_status: "COMPLETED", post_production_status: "FOR_EDITING" });
  assert.equal((await editing.run({ id: "test", uploadsConfirmed: true })).status, 409);
  assert.equal(editing.sends.length, 0);
});

test("endpoint uses saved recipients and marks delivery only after notification success", async () => {
  const h = endpointHarness();
  assert.equal((await h.run({ id: "test", uploadsConfirmed: true, email: "injected@example.test" })).status, 200);
  assert.equal(h.sends[0].email, booking.email);
  assert.equal(h.writes[0].post_production_status, "DELIVERED");
  assert.equal(h.writes[0].delivered_at, "2026-10-03T12:00:00Z");
});
