import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const source = readFileSync(new URL("../scripts/SmsHistory.gs", import.meta.url), "utf8");
function harness({pages = [], status = 200} = {}) {
  const calls = [], cache = new Map();
  const context = vm.createContext({
    CacheService: {getScriptCache: () => ({get: key => cache.get(key), put: (key,value) => cache.set(key,value)})},
    PropertiesService: {getScriptProperties: () => ({getProperty: () => "test"})},
    Utilities: {formatDate: date => date.toISOString().slice(0,10)},
    UrlFetchApp: {fetch: (url,options) => {calls.push({url,options}); return {getResponseCode: () => status, getContentText: () => JSON.stringify(pages[calls.length-1] || {data:[]})};}},
  });
  vm.runInContext(source,context);
  return {calls, run: () => context.handlePhilSmsHistory_({parameter:{phone:"09151574523",start_date:"2026-09-26",end_date:"2026-10-17"}})};
}
test("history honors requested dates, exact recipient and caches without sending SMS", () => {
  const h = harness({pages:[{data:{data:[
    {uid:"match",to:"639151574523",message:"ready",sent_at:"2026-10-04 12:00:00"},
    {uid:"missing-phone",message:"private",sent_at:"2026-10-04"},
    {uid:"wrong",to:"639171234567",message:"private",sent_at:"2026-10-04"},
    {uid:"old",to:"639151574523",message:"old",sent_at:"2025-10-04"},
  ]}}]});
  assert.equal(h.run().messages.length,1);
  assert.equal(h.run().messages[0].id,"match");
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].options.method,"get");
  const url = new URL(h.calls[0].url);
  assert.equal(url.searchParams.get("start_date"),"2026-09-26");
  assert.equal(url.searchParams.get("end_date"),"2026-10-17");
});
test("provider pagination is bounded and marks incomplete history", () => {
  const h = harness({pages:Array.from({length:10},()=>({data:{data:[],next_page_url:"more"}}))});
  const result = h.run();
  assert.equal(h.calls.length,8);
  assert.equal(result.ok,true);
  assert.match(result.warning,/older SMS/);
});
test("provider failures remain errors rather than empty successful history", () => {
  const h = harness({status:401});
  assert.equal(h.run().ok,false);
  assert.equal(h.calls.length,1);
});
