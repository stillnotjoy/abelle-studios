// Replace only handlePhilSmsHistory_ and getPhilSmsHistory_ in Code.gs.
function handlePhilSmsHistory_(e) {
  try {
    var phone = String(e.parameter.phone || "").trim();
    if (!phone) throw new Error("A customer mobile number is required.");
    var token = PropertiesService.getScriptProperties().getProperty("PHILSMS_API_TOKEN");
    if (!token) throw new Error("PHILSMS_API_TOKEN is missing from Script Properties.");
    return getPhilSmsHistory_(phone, token, e.parameter.start_date, e.parameter.end_date);
  } catch (error) { return { ok: false, error: error.message || String(error) }; }
}

function getPhilSmsHistory_(phone, apiToken, requestedStart, requestedEnd) {
  var target = String(phone || "").replace(/\D/g, "");
  if (/^09\d{9}$/.test(target)) target = "63" + target.slice(1);
  if (/^9\d{9}$/.test(target)) target = "63" + target;
  if (!/^639\d{9}$/.test(target)) throw new Error("A valid Philippine mobile number is required.");
  var today = new Date();
  var defaultStart = new Date(today.getTime() - 120 * 86400000);
  var start = requestedStart || Utilities.formatDate(defaultStart, "Asia/Manila", "yyyy-MM-dd");
  var end = requestedEnd || Utilities.formatDate(today, "Asia/Manila", "yyyy-MM-dd");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || !isFinite(Date.parse(start)) || !isFinite(Date.parse(end)) || start > end) throw new Error("Valid SMS history dates are required.");
  var cache = CacheService.getScriptCache();
  var key = "sms-history-v2:" + target + ":" + start + ":" + end;
  var cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  var messages = [], seen = {}, more = false;
  var deadline = Date.now() + 12000;
  for (var page = 1; page <= 8; page++) {
    if (Date.now() >= deadline) { more = true; break; }
    var url = "https://dashboard.philsms.com/api/v3/sms?start_date=" + encodeURIComponent(start) + "&end_date=" + encodeURIComponent(end) + "&page=" + page + "&per_page=100";
    var response = UrlFetchApp.fetch(url, { method: "get", headers: { Authorization: "Bearer " + apiToken, Accept: "application/json" }, muteHttpExceptions: true });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error("PhilSMS history request failed (HTTP " + response.getResponseCode() + ").");
    var payload = JSON.parse(response.getContentText());
    if (payload.status === "error") throw new Error("PhilSMS rejected the history request.");
    var data = payload.data || {};
    var batch = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
    batch.forEach(function(message) {
      var recipient = String(message.to || message.recipient || message.phone || "").replace(/\D/g, "");
      if (/^09\d{9}$/.test(recipient)) recipient = "63" + recipient.slice(1);
      if (/^9\d{9}$/.test(recipient)) recipient = "63" + recipient;
      if (recipient !== target) return;
      var date = message.sent_at || message.created_at || message.createdAt || message.timestamp || "";
      var day = String(date).slice(0, 10);
      if (day && (day < start || day > end)) return;
      var text = message.message || message.body || message.text || "";
      var id = message.uid || message.id || recipient + ":" + date + ":" + text;
      if (seen[id]) return;
      seen[id] = true;
      messages.push({ id: id, text: text, date: date, status: message.status || "unknown", direction: /in/i.test(message.direction || "api") ? "inbound" : "outbound" });
    });
    more = Boolean(data.next_page_url || payload.next_page_url || (data.last_page && page < data.last_page));
    if (!more) break;
  }
  var result = { ok: true, messages: messages, warning: more ? "Some older SMS records could not be loaded in this lookup. Saved conversations are still shown." : "" };
  // Oversized responses remain usable even when they exceed the cache limit.
  try { cache.put(key, JSON.stringify(result), 30); } catch (ignored) { }
  return result;
}
