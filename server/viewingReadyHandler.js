/* global process */
import { notifyViewingReady } from "./viewingReady.js";

async function database(path, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options, headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=representation" },
  });
  const data = await response.json();
  if (!response.ok) throw new Error("Could not read or save the photo-delivery booking.");
  return data;
}

export default async function handler(req, res) {
  // Called only after requireAdmin in the existing booking endpoint.
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  try {
    if (!req.body?.id || req.body.uploadsConfirmed !== true) {
      return res.status(400).json({ error: "Confirm editing is complete and all final photos are uploaded before sending." });
    }
    const id = encodeURIComponent(String(req.body.id));
    const [booking] = await database(`manual_bookings?id=eq.${id}&select=*&limit=1`);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.shoot_status !== "COMPLETED" || !["READY_FOR_DELIVERY", "DELIVERED"].includes(booking.post_production_status)) {
      return res.status(409).json({ error: "Complete editing and mark this booking ready first." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email || "") || !booking.phone) {
      return res.status(400).json({ error: "Save the client's email and mobile number on the booking first." });
    }
    if (!/^https:\/\/drive\.google\.com\/.*folders\/[A-Za-z0-9_-]+/.test(booking.client_drive_folder_url || "")) {
      return res.status(400).json({ error: "Connect a valid Google Drive photo folder first." });
    }
    const delivery = await notifyViewingReady(booking);
    const [updated] = await database(`manual_bookings?id=eq.${id}`, { method: "PATCH",
      body: JSON.stringify({ post_production_status: "DELIVERED", delivered_at: delivery.deliveredAt }),
    });
    if (!updated) throw new Error("Notifications sent, but delivery status was not saved. Retry this action to recover the status; completed channels will not resend.");
    return res.status(200).json({ success: true, booking: updated, delivery,
      message: "Folder access granted. The viewing-ready email and text were sent. Completed notifications will not resend on retry." });
  } catch (error) {
    console.error("Viewing-ready delivery failed:", error.name);
    return res.status(502).json({ error: error.message });
  }
}
