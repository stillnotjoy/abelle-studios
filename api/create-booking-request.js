export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

    if (!appsScriptUrl || !appsScriptSecret) {
      return response.status(500).json({
        error: "Missing Apps Script environment variables.",
      });
    }

    const bookingPayload = {
      secret: appsScriptSecret,
      action: "create_pending_booking",
      ...request.body,
    };

    const appsScriptResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingPayload),
    });

    const text = await appsScriptResponse.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return response.status(500).json({
        error: "Could not read Apps Script response.",
        details: text,
      });
    }

    if (!data.ok) {
      return response.status(500).json({
        error: "Could not save booking request.",
        details: data,
      });
    }

    return response.status(200).json(data);
  } catch (error) {
    console.error("Booking request error:", error);

    return response.status(500).json({
      error: "Something went wrong while saving booking request.",
    });
  }
}