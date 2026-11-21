import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
// Authentication fixtures only: no real credentials or external requests.
process.env.SUPABASE_URL = "https://example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const { default: handler } = await import("../api/admin-tools.js");

const root = new URL("../", import.meta.url);
function response() {
  return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test("API entry points stay below the Hobby function limit", () => {
  const files = readdirSync(new URL("api/", root), { recursive: true });
  const functions = files.filter(name => /\.(js|ts|mjs|cjs)$/.test(name));
  assert.equal(functions.length, 10);
  assert.ok(functions.length <= 12);
});

const routes = {
  "admin-calendar-sync": "calendar-sync",
  "admin-booking-import-preview": "booking-import-preview",
  "admin-revenue-report": "revenue-report",
};
for (const [legacy, tool] of Object.entries(routes)) {
  test(`${legacy} keeps its URL and rejects unauthenticated GET and POST`, async () => {
    const config = JSON.parse(readFileSync(new URL("vercel.json", root), "utf8"));
    assert.ok(config.rewrites.some(route => route.source === `/api/${legacy}` && route.destination === `/api/admin-tools?tool=${tool}`));
    for (const method of ["GET", "POST"]) {
      const res = response();
      await handler({ method, headers: {}, query: { tool, start: "2026-10-01", end: "2026-10-03" }, body: { action: "import_confirmed_history" } }, res);
      assert.equal(res.code, 401);
    }
  });
}

test("unknown, missing and prototype-like selectors cannot dispatch handlers", async () => {
  for (const tool of [undefined, "unknown", "constructor", "__proto__", ["calendar-sync"]]) {
    const res = response();
    await handler({ query: { tool } }, res);
    assert.equal(res.code, 404);
  }
});
