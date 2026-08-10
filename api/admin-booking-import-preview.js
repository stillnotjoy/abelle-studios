/* global process */

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_PIN =
  process.env.ADMIN_DISCOUNT_PIN ||
  process.env.ADMIN_PIN ||
  "1234";

const GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL;

const GOOGLE_APPS_SCRIPT_SECRET =
  process.env.GOOGLE_APPS_SCRIPT_SECRET;

const INACTIVE_STATUS_WORDS = [
  "CANCELLED",
  "CANCELED",
  "DECLINED",
  "EXPIRED",
  "REJECTED",
  "VOID",
];

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

function requireAdmin(request, response) {
  const pin = request.headers["x-admin-pin"];

  if (!pin || pin !== ADMIN_PIN) {
    sendJson(response, 401, {
      error: "Unauthorized admin request.",
    });
    return false;
  }

  return true;
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeReference(value) {
  return cleanText(value).toUpperCase();
}

function normalizeEventId(value) {
  return cleanText(value);
}

function normalizeDate(value) {
  const text = cleanText(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const slashMatch = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(
      2,
      "0"
    )}-${slashMatch[2].padStart(2, "0")}`;
  }

  return "";
}

function normalizeTime(value) {
  const text = cleanText(value);
  const match = text.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
  );

  if (!match) {
    return "";
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const period = cleanText(match[3]).toUpperCase();

  if (period === "PM" && hour < 12) {
    hour += 12;
  }

  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  if (hour > 23) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function isInactiveStatus(value) {
  const status = cleanText(value).toUpperCase();

  return INACTIVE_STATUS_WORDS.some((word) =>
    status.includes(word)
  );
}

function extractReferenceFromTitle(value) {
  const title = cleanText(value);
  const firstSegment = cleanText(
    title.split(" - ")[0]
  );

  if (
    /^(AB|ABELLE)-[A-Z0-9-]*\d[A-Z0-9-]*$/i.test(
      firstSegment
    )
  ) {
    return normalizeReference(firstSegment);
  }

  return "";
}

async function readJson(response, fallbackMessage) {
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok || !data) {
    throw new Error(
      data?.error ||
        data?.message ||
        fallbackMessage
    );
  }

  return data;
}

async function fetchSheetRows() {
  const rows = [];
  let offset = 0;
  const limit = 500;
  let totalRows = 0;

  for (let page = 0; page < 10; page += 1) {
    const url = new URL(
      GOOGLE_APPS_SCRIPT_URL
    );
    url.searchParams.set(
      "secret",
      GOOGLE_APPS_SCRIPT_SECRET
    );
    url.searchParams.set(
      "action",
      "booking_sheet_snapshot"
    );
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(limit));

    const data = await readJson(
      await fetch(url, {
        method: "GET",
        cache: "no-store",
      }),
      "The booking spreadsheet could not be read."
    );

    if (!data.ok) {
      throw new Error(
        data.error ||
          "The booking spreadsheet could not be read."
      );
    }

    const pageRows = Array.isArray(data.rows)
      ? data.rows
      : [];

    rows.push(...pageRows);
    totalRows = Number(data.totalRows || rows.length);

    if (!data.hasMore) {
      break;
    }

    offset += limit;
  }

  return {
    rows,
    totalRows,
  };
}

async function fetchCrmBookings() {
  const fields = [
    "id",
    "booking_reference",
    "client_name",
    "shoot_date",
    "shoot_time",
    "booking_status",
    "calendar_event_id",
  ].join(",");

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/manual_bookings?select=${fields}&order=created_at.desc&limit=5000`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    }
  );

  const data = await readJson(
    response,
    "CRM bookings could not be loaded."
  );

  return Array.isArray(data) ? data : [];
}

function getMonthRanges(rows) {
  const monthKeys = new Set();

  rows.forEach((row) => {
    const date = normalizeDate(row.shootDate);

    if (date) {
      monthKeys.add(date.slice(0, 7));
    }
  });

  return Array.from(monthKeys)
    .sort()
    .map((monthKey) => {
      const [year, month] = monthKey
        .split("-")
        .map(Number);
      const start = `${monthKey}-01`;
      const endDate = new Date(
        Date.UTC(year, month, 1)
      );
      const end = endDate
        .toISOString()
        .slice(0, 10);

      return { start, end };
    });
}

async function fetchCalendarEvents(rows) {
  const ranges = getMonthRanges(rows);

  const responses = await Promise.all(
    ranges.map(async (range) => {
      const url = new URL(
        GOOGLE_APPS_SCRIPT_URL
      );
      url.searchParams.set(
        "secret",
        GOOGLE_APPS_SCRIPT_SECRET
      );
      url.searchParams.set(
        "action",
        "calendar_sync_snapshot"
      );
      url.searchParams.set("start", range.start);
      url.searchParams.set("end", range.end);

      const data = await readJson(
        await fetch(url, {
          method: "GET",
          cache: "no-store",
        }),
        "Google Calendar could not be checked."
      );

      if (!data.ok) {
        throw new Error(
          data.error ||
            "Google Calendar could not be checked."
        );
      }

      return Array.isArray(data.events)
        ? data.events
        : [];
    })
  );

  return responses.flat();
}

function getManilaDateTimeKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
  ).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function buildPreview(
  sheetRows,
  crmBookings,
  calendarEvents
) {
  const crmByReference = new Map();
  const calendarById = new Map();
  const calendarByReference = new Map();
  const sheetReferenceCounts = new Map();
  const activeSlotCounts = new Map();

  crmBookings.forEach((booking) => {
    const reference = normalizeReference(
      booking.booking_reference
    );

    if (reference) {
      crmByReference.set(reference, booking);
    }
  });

  calendarEvents.forEach((event) => {
    const eventId = normalizeEventId(
      event.eventId
    );
    const reference = normalizeReference(
      event.bookingReference ||
        extractReferenceFromTitle(event.title)
    );

    if (eventId) {
      calendarById.set(eventId, event);
    }

    if (reference) {
      calendarByReference.set(reference, event);
    }
  });

  sheetRows.forEach((row) => {
    const reference = normalizeReference(
      row.bookingReference
    );
    const date = normalizeDate(row.shootDate);
    const time = normalizeTime(row.shootTime);

    if (reference) {
      sheetReferenceCounts.set(
        reference,
        (sheetReferenceCounts.get(reference) || 0) + 1
      );
    }

    if (
      date &&
      time &&
      !isInactiveStatus(row.status)
    ) {
      const slotKey = `${date}T${time}`;
      activeSlotCounts.set(
        slotKey,
        (activeSlotCounts.get(slotKey) || 0) + 1
      );
    }
  });

  const rows = sheetRows.map((row) => {
    const reference = normalizeReference(
      row.bookingReference
    );
    const date = normalizeDate(row.shootDate);
    const time = normalizeTime(row.shootTime);
    const inactive = isInactiveStatus(row.status);
    const crmBooking = reference
      ? crmByReference.get(reference)
      : null;
    const eventId = normalizeEventId(
      row.calendarEventId ||
        crmBooking?.calendar_event_id
    );
    const calendarEvent =
      (eventId && calendarById.get(eventId)) ||
      (reference &&
        calendarByReference.get(reference)) ||
      null;
    const duplicateReference =
      reference &&
      sheetReferenceCounts.get(reference) > 1;
    const slotKey =
      date && time ? `${date}T${time}` : "";
    const duplicateSlot =
      !inactive &&
      slotKey &&
      activeSlotCounts.get(slotKey) > 1;

    let code = "matched";
    let label = "Already matched";

    if (
      !reference ||
      !cleanText(row.clientName) ||
      !date ||
      !time
    ) {
      code = "incomplete";
      label = "Missing required details";
    } else if (duplicateReference) {
      code = "duplicate_reference";
      label = "Duplicate booking reference";
    } else if (duplicateSlot) {
      code = "duplicate_slot";
      label = "Duplicate active time slot";
    } else if (!crmBooking && !calendarEvent) {
      code = "missing_both";
      label = inactive
        ? "Missing from CRM"
        : "Missing from CRM and Google Calendar";
    } else if (!crmBooking) {
      code = "missing_crm";
      label = "Missing from CRM";
    } else if (!inactive && !calendarEvent) {
      code = "missing_calendar";
      label = "Google Calendar event missing";
    } else if (!inactive && calendarEvent) {
      const sheetDateTime = `${date}T${time}`;
      const calendarDateTime =
        getManilaDateTimeKey(calendarEvent.start);

      if (
        calendarDateTime &&
        sheetDateTime !== calendarDateTime
      ) {
        code = "calendar_mismatch";
        label = "Google Calendar time differs";
      }
    }

    return {
      rowNumber: Number(row.rowNumber || 0),
      bookingReference: reference,
      clientName: cleanText(row.clientName),
      packageTitle: cleanText(row.packageTitle),
      shootDate: date || cleanText(row.shootDate),
      shootTime: time || cleanText(row.shootTime),
      sheetStatus: cleanText(row.status),
      code,
      label,
      crmBookingId: crmBooking?.id || null,
      calendarEventFound: Boolean(calendarEvent),
    };
  });

  const count = (codes) =>
    rows.filter((row) =>
      codes.includes(row.code)
    ).length;

  const sheetReferences = new Set(
    rows
      .map((row) => row.bookingReference)
      .filter(Boolean)
  );

  return {
    rows,
    summary: {
      sheetRows: rows.length,
      matched: count(["matched"]),
      missingCrm: count([
        "missing_crm",
        "missing_both",
      ]),
      missingCalendar: count([
        "missing_calendar",
        "missing_both",
      ]),
      mismatchedCalendar: count([
        "calendar_mismatch",
      ]),
      needsReview: count([
        "incomplete",
        "duplicate_reference",
        "duplicate_slot",
      ]),
      crmOnly: crmBookings.filter(
        (booking) =>
          !sheetReferences.has(
            normalizeReference(
              booking.booking_reference
            )
          )
      ).length,
    },
  };
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
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !GOOGLE_APPS_SCRIPT_URL ||
      !GOOGLE_APPS_SCRIPT_SECRET
    ) {
      return sendJson(response, 500, {
        error:
          "Historical booking preview is not configured.",
      });
    }

    const [{ rows: sheetRows }, crmBookings] =
      await Promise.all([
        fetchSheetRows(),
        fetchCrmBookings(),
      ]);

    const calendarEvents =
      await fetchCalendarEvents(sheetRows);

    const preview = buildPreview(
      sheetRows,
      crmBookings,
      calendarEvents
    );

    response.setHeader(
      "Cache-Control",
      "no-store"
    );

    return sendJson(response, 200, {
      ok: true,
      generatedAt: new Date().toISOString(),
      ...preview,
    });
  } catch (error) {
    console.error(
      "Historical booking preview failed:",
      error
    );

    return sendJson(response, 500, {
      error:
        error.message ||
        "Historical booking preview failed.",
    });
  }
}
