// Add this file to Apps Script; install the two routes from docs/PHOTO-DELIVERY-HANDOFF.md.
function viewingReadyCapabilities_() {
  // Do not advertise support if only the GET route was installed.
  if (typeof doPost !== "function" || String(doPost).indexOf("notifyViewingReady_(payload)") < 0) {
    return { ok: false, error: "Install the notify_viewing_ready doPost route before activation." };
  }
  return { ok: true, viewingReadyVersion: 1, folderRole: "reader", fromEmail: "hello@abellestudios.xyz" };
}

function notifyViewingReady_(p) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, error: "Another delivery is in progress. Wait before retrying." };
  try {
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty("VIEWING_READY_PHILSMS_TOKEN") || props.getProperty("PHILSMS_API_TOKEN");
    var sender = props.getProperty("VIEWING_READY_PHILSMS_SENDER") || props.getProperty("PHILSMS_SENDER_ID");
    if (!token || !sender) throw new Error("Configure the viewing-ready PhilSMS token and approved sender first. No messages sent.");
    var fromEmail = getViewingReadySender_();
    var email = String(p.email || "").trim().toLowerCase();
    var phone = String(p.phone || "").replace(/\D/g, "");
    if (/^09\d{9}$/.test(phone)) phone = "63" + phone.slice(1);
    if (/^9\d{9}$/.test(phone)) phone = "63" + phone;
    var folderMatch = String(p.folderUrl || "").match(/^https:\/\/drive\.google\.com\/.*folders\/([A-Za-z0-9_-]+)/);
    if (!p.bookingId || !p.bookingReference || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^639\d{9}$/.test(phone) || !folderMatch || !p.html || !p.body || !p.sms) throw new Error("Valid booking, email, mobile number, folder and messages are required.");
    var folderId = folderMatch[1];
    if (p.folderId && String(p.folderId) !== folderId) throw new Error("The saved folder ID does not match its URL.");
    var key = "viewing_ready:" + p.bookingId;
    var state = JSON.parse(props.getProperty(key) || "{}");
    var fingerprint = JSON.stringify([email, phone, folderId]);
    if (state.fingerprint && state.fingerprint !== fingerprint) throw new Error("Delivery details changed after sending began. Review the original recipients before sending again.");
    if ([state.emailStatus, state.smsStatus].some(function(status) { return status === "sending" || status === "unknown"; })) throw new Error("A previous send has an uncertain outcome. Check Gmail/PhilSMS before resolving its delivery state. Nothing was resent.");
    var folder = DriveApp.getFolderById(folderId);
    if (!folder.getFiles().hasNext() && !folder.getFolders().hasNext()) throw new Error("The photo folder is empty. Upload the final photos first.");
    state.fingerprint = fingerprint;
    if (!state.viewerGranted) {
      grantViewingViewer_(folderId, email);
      state.viewerGranted = true;
      props.setProperty(key, JSON.stringify(state));
    }
    if (state.emailStatus !== "sent") {
      if (MailApp.getRemainingDailyQuota() < 1) throw new Error("Email daily quota is exhausted. No viewing email was sent.");
      state.deliveredAt = new Date().toISOString();
      state.freeUntil = new Date(Date.parse(state.deliveredAt) + 30 * 86400000).toISOString();
      var deadline = Utilities.formatDate(new Date(state.freeUntil), "Asia/Manila", "MMMM d, yyyy");
      state.emailStatus = "sending";
      props.setProperty(key, JSON.stringify(state));
      try {
        GmailApp.sendEmail(email, p.subject, String(p.body).split("{{FREE_UNTIL}}").join(deadline), {
          from: fromEmail, replyTo: fromEmail, name: "Abelle Studios",
          htmlBody: String(p.html).split("{{FREE_UNTIL}}").join(deadline) });
        state.emailStatus = "sent";
        props.setProperty(key, JSON.stringify(state));
      } catch (mailError) {
        state.emailStatus = "unknown";
        props.setProperty(key, JSON.stringify(state));
        throw new Error("Email outcome is uncertain. Check Gmail before retrying; nothing will automatically resend.");
      }
      logViewingEvent_(p, "email", String(p.body).split("{{FREE_UNTIL}}").join(deadline), p.subject);
    }
    if (state.smsStatus !== "sent") {
      state.smsStatus = "sending";
      props.setProperty(key, JSON.stringify(state));
      var response;
      var data;
      try {
        response = UrlFetchApp.fetch("https://dashboard.philsms.com/api/v3/sms/send", { method: "post", contentType: "application/json", muteHttpExceptions: true,
          headers: { Authorization: "Bearer " + token, Accept: "application/json" },
          payload: JSON.stringify({ recipient: phone, sender_id: sender, type: "plain", message: p.sms }) });
        data = JSON.parse(response.getContentText());
      } catch (smsError) {
        state.smsStatus = "unknown";
        props.setProperty(key, JSON.stringify(state));
        throw new Error("Email sent. SMS outcome is uncertain; check PhilSMS before retrying. Email will not resend.");
      }
      if (data.status === "error") {
        state.smsStatus = "failed";
        props.setProperty(key, JSON.stringify(state));
        throw new Error("Email sent. PhilSMS rejected the text. Correct its configuration/credits, then retry; the email will not resend.");
      }
      if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || data.status !== "success") {
        state.smsStatus = "unknown";
        props.setProperty(key, JSON.stringify(state));
        throw new Error("Email sent. SMS outcome is uncertain; check PhilSMS before retrying. Email will not resend.");
      }
      state.smsStatus = "sent";
      state.smsAcceptedAt = new Date().toISOString();
      props.setProperty(key, JSON.stringify(state));
      logViewingEvent_(p, "sms", p.sms, "");
    }
    return { ok: true, viewerGranted: state.viewerGranted, editorGranted: false, emailSent: true, smsSent: true,
      deliveredAt: state.deliveredAt, freeUntil: state.freeUntil, storageMonthlyPrice: 99 };
  } catch (error) { return { ok: false, error: error.message }; }
  finally { lock.releaseLock(); }
}

function grantViewingViewer_(folderId, email) {
  // Suppress Google's additional sharing email; our designed email contains the folder link.
  if (typeof Drive === "undefined") throw new Error("Enable the Google Drive API v3 service in Apps Script first. No messages sent.");
  var pageToken;
  var user;
  do {
    var options = { supportsAllDrives: true, fields: "nextPageToken,permissions(id,emailAddress,role)", pageSize: 100 };
    if (pageToken) options.pageToken = pageToken;
    var page = Drive.Permissions.list(folderId, options);
    user = (page.permissions || []).filter(function(item) { return String(item.emailAddress || "").toLowerCase() === email; })[0];
    pageToken = page.nextPageToken;
  } while (!user && pageToken);
  if (user && ["owner", "organizer", "fileOrganizer"].indexOf(user.role) >= 0) throw new Error("The booking email has owner or manager access. Use a separate client email for Viewer access.");
  if (user && user.role === "reader") return;
  if (user) Drive.Permissions.update({ role: "reader" }, folderId, user.id, { supportsAllDrives: true });
  else Drive.Permissions.create({ role: "reader", type: "user", emailAddress: email }, folderId, { supportsAllDrives: true, sendNotificationEmail: false });
}

// Run once from the Apps Script editor to authorize this feature; sends no messages.
function authorizeViewingReady() {
  if (typeof Drive === "undefined") throw new Error("Add the Drive API v3 service first.");
  Drive.Files.list({ pageSize: 1, fields: "files(id)" });
  MailApp.getRemainingDailyQuota();
  console.log("Verified email sender: " + getViewingReadySender_());
}

function getViewingReadySender_() {
  var address = "hello@abellestudios.xyz";
  if (!GmailApp.getAliases().some(function(alias) { return String(alias).toLowerCase() === address; })) {
    throw new Error("Add hello@abellestudios.xyz as a verified Gmail Send mail as alias on the script owner's account. No viewing notifications sent.");
  }
  return address;
}

function logViewingEvent_(p, channel, message, subject) {
  if (typeof logAbelleCustomerEvent_ !== "function") return;
  try { logAbelleCustomerEvent_({ kind: "conversation", type: channel, direction: "outbound", status: "sent",
    customerName: p.name, customerEmail: p.email, customerPhone: p.phone, bookingReference: p.bookingReference,
    subject: subject, message: message, provider: channel === "sms" ? "philsms" : "gmail" }); } catch (ignored) { /* Already recorded. */ }
}
