const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const NON_BLOCKING_BOOKING_STATUSES = new Set([
  "CANCELLED",
  "CANCELED",
  "DECLINED",
  "EXPIRED",
  "REJECTED",
]);

async function getCrmBookedTimes(date) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const url =
    `${SUPABASE_URL}/rest/v1/manual_bookings` +
    `?select=shoot_time,booking_status` +
    `&shoot_date=eq.${encodeURIComponent(date)}`;

  const crmResponse = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization:
        `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const responseText = await crmResponse.text();

  let rows = [];

  try {
    rows = responseText ? JSON.parse(responseText) : [];
  } catch {
    throw new Error(
      "Could not read CRM availability data."
    );
  }

  if (!crmResponse.ok || !Array.isArray(rows)) {
    console.error(
      "CRM availability lookup failed:",
      rows
    );

    throw new Error(
      "Could not check CRM availability."
    );
  }

  return rows
    .filter((row) => {
      const status = String(
        row?.booking_status || ""
      ).toUpperCase();

      return !NON_BLOCKING_BOOKING_STATUSES.has(
        status
      );
    })
    .map((row) => String(row?.shoot_time || "").trim())
    .filter(Boolean);
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { date } = request.query;

    if (!date) {
      return response.status(400).json({ error: "Missing date." });
    }

    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
    const bookedTimes = new Set(
      await getCrmBookedTimes(date)
    );
    let calendarSynced = false;

    if (appsScriptUrl && appsScriptSecret) {
      try {
        const url = new URL(appsScriptUrl);
        url.searchParams.set("date", date);
        url.searchParams.set(
          "secret",
          appsScriptSecret
        );

        const calendarResponse = await fetch(
          url.toString()
        );

        const calendarText =
          await calendarResponse.text();

        const calendarData = JSON.parse(
          calendarText
        );

        if (calendarResponse.ok && calendarData.ok) {
          for (const time of (
            calendarData.bookedTimes || []
          )) {
            const cleanTime = String(time || "").trim();

            if (cleanTime) {
              bookedTimes.add(cleanTime);
            }
          }

          calendarSynced = true;
        } else {
          console.warn(
            "Calendar availability sync failed; using CRM availability.",
            calendarData
          );
        }
      } catch (calendarError) {
        console.warn(
          "Calendar availability sync error; using CRM availability:",
          calendarError
        );
      }
    }

    return response.status(200).json({
      bookedTimes: Array.from(bookedTimes),
      source: calendarSynced
        ? "CRM_AND_CALENDAR"
        : "CRM",
    });
  } catch (error) {
    console.error("Available slots error:", error);

    return response.status(500).json({
      error: "Something went wrong while checking available slots.",
    });
  }
}
