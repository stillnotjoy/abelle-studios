/* global process */

export function buildViewingMessage(booking) {
  const escape = value => String(value || "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
  const name = escape(booking.client_name || "there");
  const link = escape(booking.client_drive_folder_url);
  const reference = escape(booking.booking_reference);
  const subject = "Your photos are ready for viewing | Abelle Studios";
  const body = `Hi ${booking.client_name || "there"},\n\nYour edited photos are uploaded and your folder is ready for viewing:\n${booking.client_drive_folder_url}\n\nSign in with ${booking.email} to access your folder with viewer permission.\n\nPlease do not rename the shared folder, move it, or change its contents. This helps us keep your photos organized and provide support. You may freely rename the copies you download to your own device.\n\nDownload your copies for free within 30 days, until {{FREE_UNTIL}}. After the free period, continued photo storage is available for PHP 99 per month by arrangement. Please contact us before the deadline if you would like to extend storage. Without an extension, photos may be removed from our system after 30 days. There is no automatic charge.\n\nThank you for creating memories with Abelle Studios!\nBooking: ${booking.booking_reference}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3efe9;color:#302922;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:auto;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="padding:36px;background:#292722;color:#fff"><p style="font-size:12px;letter-spacing:4px;margin:0 0 24px;color:#d9c4a1">ABELLE STUDIOS</p><h1 style="font-family:Georgia,serif;font-size:36px;font-weight:normal;line-height:1.15;margin:0">Your memories,<br>ready to revisit.</h1><p style="color:#e6ddd0;line-height:1.7;margin-bottom:0">Your photo folder is ready for viewing.</p></td></tr><tr><td style="padding:32px 36px"><p style="line-height:1.7">Hi ${name},</p><p style="line-height:1.7">The finishing touches are complete and all your edited photos have been uploaded. We’re excited for you to see them!</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#a98654;border-radius:8px"><a href="${link}" style="display:inline-block;padding:16px 25px;color:#fff;text-decoration:none;font-weight:bold">View your photos &rarr;</a></td></tr></table><p style="font-size:13px;line-height:1.7;color:#72675a">Sign in using <strong>${escape(booking.email)}</strong>. This booking email has viewer access to view and download photos to your folder.</p><p style="font-size:13px;line-height:1.7;color:#72675a;background:#f8f4ee;border-left:3px solid #a98654;padding:14px 16px"><strong>Please keep the shared folder name unchanged.</strong><br>Please do not rename or move the shared folder, or change its contents. This helps us keep your photos organized and provide support. You may freely rename the copies you download to your own device.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px"><tr><td style="padding:23px"><h2 style="font-family:Georgia,serif;font-size:23px;font-weight:normal;margin:0 0 12px">Keep your favorites, forever.</h2><p style="font-size:14px;line-height:1.8;margin:0">Your photos are available for free viewing and download for <strong>30 days</strong>, until <strong>{{FREE_UNTIL}}</strong>. Please save your own copies during this period.</p><p style="font-size:14px;line-height:1.8;margin-bottom:0">Need more time? Continued storage is available for <strong>₱99 per month</strong> by arrangement. Contact us before the deadline to extend storage. Without an extension, photos may be removed from our system after 30 days. <strong>No automatic charges apply.</strong></p></td></tr></table><p style="line-height:1.7;margin-top:26px">Thank you for letting us capture your moments.<br><strong>With love, Abelle Studios</strong></p><p style="font-size:11px;color:#8a8176;border-top:1px solid #eee5d9;padding-top:20px">Booking ${reference}<br>If the button doesn’t open, copy this link:<br><a href="${link}" style="color:#8c6b3f;word-break:break-all">${link}</a></p></td></tr></table></td></tr></table></body></html>`;
  const sms = "Abelle Studios: Your photos are ready for viewing! Please check your email for the folder link. Download your copies free within 30 days. Thank you!";
  return { subject, body, html, sms };
}

export async function notifyViewingReady(booking, fetcher = fetch) {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (!url || !secret) throw new Error("Google photo delivery connection is not configured.");
  const probe = new URL(url);
  probe.searchParams.set("secret", secret);
  probe.searchParams.set("action", "viewing_ready_capabilities");
  const capabilityResponse = await fetcher(probe, { signal: AbortSignal.timeout(15000) });
  const capability = await capabilityResponse.json();
  if (!capabilityResponse.ok || capability.viewingReadyVersion !== 1 || capability.folderRole !== "reader") {
    throw new Error("Install and redeploy the photo-delivery Apps Script update before sending. No client messages were sent.");
  }
  const response = await fetcher(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(40000),
    body: JSON.stringify({ secret, action: "notify_viewing_ready", bookingId: booking.id,
      bookingReference: booking.booking_reference, name: booking.client_name,
      email: booking.email, phone: booking.phone, folderId: booking.client_drive_folder_id,
      folderUrl: booking.client_drive_folder_url, ...buildViewingMessage(booking) }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok || !data.emailSent || !data.smsSent || !data.viewerGranted) {
    throw new Error(data.error || "Photo delivery is incomplete. Check the email/SMS status before retrying.");
  }
  return data;
}
