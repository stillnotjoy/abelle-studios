import calendarSync from "../server/adminCalendarSync.js";
import bookingImport from "../server/adminBookingImportPreview.js";
import revenueReport from "../server/adminRevenueReport.js";

// Each handler retains its own admin authentication and method checks.
const handlers = new Map([
  ["calendar-sync", calendarSync],
  ["booking-import-preview", bookingImport],
  ["revenue-report", revenueReport],
]);

export default function handler(request, response) {
  const selected = handlers.get(request.query?.tool);
  if (!selected) {
    return response.status(404).json({ error: "Unknown admin tool." });
  }
  return selected(request, response);
}
