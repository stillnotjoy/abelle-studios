/* global process */

const ADMIN_PIN =
  process.env.ADMIN_DISCOUNT_PIN ||
  process.env.ADMIN_PIN ||
  "1234";

const GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL;

const GOOGLE_APPS_SCRIPT_SECRET =
  process.env.GOOGLE_APPS_SCRIPT_SECRET;

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

function requireAdmin(request, response) {
  const pinFromHeader =
    request.headers["x-admin-pin"];

  if (!ADMIN_PIN) {
    sendJson(response, 500, {
      error: "ADMIN_PIN is not configured.",
    });
    return false;
  }

  if (
    !pinFromHeader ||
    pinFromHeader !== ADMIN_PIN
  ) {
    sendJson(response, 401, {
      error: "Unauthorized admin request.",
    });
    return false;
  }

  return true;
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "")
  );
}

export default async function handler(
  request,
  response
) {
  try {
    if (!requireAdmin(request, response)) {
      return;
    }

    if (request.method !== "GET") {
      return sendJson(response, 405, {
        error: "Method not allowed.",
      });
    }

    if (
      !GOOGLE_APPS_SCRIPT_URL ||
      !GOOGLE_APPS_SCRIPT_SECRET
    ) {
      return sendJson(response, 500, {
        error:
          "Google Calendar sync is not configured.",
      });
    }

    const start = String(
      request.query?.start || ""
    ).trim();
    const end = String(
      request.query?.end || ""
    ).trim();

    if (
      !isValidDate(start) ||
      !isValidDate(end)
    ) {
      return sendJson(response, 400, {
        error:
          "Valid start and end dates are required.",
      });
    }

    const syncUrl = new URL(
      GOOGLE_APPS_SCRIPT_URL
    );

    syncUrl.searchParams.set(
      "secret",
      GOOGLE_APPS_SCRIPT_SECRET
    );
    syncUrl.searchParams.set(
      "action",
      "calendar_sync_snapshot"
    );
    syncUrl.searchParams.set(
      "start",
      start
    );
    syncUrl.searchParams.set(
      "end",
      end
    );

    const calendarResponse = await fetch(
      syncUrl.toString(),
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const responseText =
      await calendarResponse.text();

    let calendarData = null;

    try {
      calendarData = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      throw new Error(
        "Google Calendar returned an invalid response."
      );
    }

    if (
      !calendarResponse.ok ||
      !calendarData?.ok
    ) {
      throw new Error(
        calendarData?.error ||
          "Google Calendar could not be checked."
      );
    }

    const events = Array.isArray(
      calendarData.events
    )
      ? calendarData.events.map(
          (event) => ({
            eventId: String(
              event?.eventId || ""
            ).trim(),
            bookingReference: String(
              event?.bookingReference || ""
            )
              .trim()
              .toUpperCase(),
            start: String(
              event?.start || ""
            ).trim(),
            end: String(
              event?.end || ""
            ).trim(),
            allDay: Boolean(
              event?.allDay
            ),
          })
        )
      : [];

    response.setHeader(
      "Cache-Control",
      "no-store"
    );

    return sendJson(response, 200, {
      ok: true,
      start,
      end,
      count: events.length,
      events,
      checkedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Admin calendar sync failed:",
      error
    );

    return sendJson(response, 500, {
      error:
        error.message ||
        "Google Calendar sync failed.",
    });
  }
}
