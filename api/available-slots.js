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

    if (!appsScriptUrl || !appsScriptSecret) {
      return response.status(500).json({
        error: "Missing Apps Script environment variables.",
      });
    }

    const url = new URL(appsScriptUrl);
    url.searchParams.set("date", date);
    url.searchParams.set("secret", appsScriptSecret);

    const calendarResponse = await fetch(url.toString());
    const calendarText = await calendarResponse.text();

    let calendarData;

    try {
      calendarData = JSON.parse(calendarText);
    } catch {
      return response.status(500).json({
        error: "Could not read Google Calendar response.",
        details: calendarText,
      });
    }

    if (!calendarData.ok) {
      return response.status(500).json({
        error: "Could not check availability.",
        details: calendarData,
      });
    }

    return response.status(200).json({
      bookedTimes: calendarData.bookedTimes || [],
    });
  } catch (error) {
    console.error("Available slots error:", error);

    return response.status(500).json({
      error: "Something went wrong while checking available slots.",
    });
  }
}