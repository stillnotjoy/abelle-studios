export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = request.body;

    const eventType = event?.data?.attributes?.type;
    const checkoutSession = event?.data?.attributes?.data;
    const checkoutAttributes = checkoutSession?.attributes;
    const metadata = checkoutAttributes?.metadata || {};

    console.log("PAYMONGO WEBHOOK RECEIVED");
    console.log("Event type:", eventType);
    console.log("Booking metadata:", metadata);

    if (eventType !== "checkout_session.payment.paid") {
      return response.status(200).json({
        received: true,
        ignored: true,
        eventType,
      });
    }

    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const appsScriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

    if (!appsScriptUrl || !appsScriptSecret) {
      console.error("Missing Apps Script environment variables.");

      return response.status(500).json({
        error: "Missing Apps Script environment variables.",
      });
    }

   const bookingPayload = {
  secret: appsScriptSecret,

  name: metadata.name,
  email: metadata.email,
  phone: metadata.phone,

  packageTitle: metadata.packageTitle,
  packagePrice: metadata.packagePrice,
  amountDueToday: metadata.amountDueToday,
  onlineFee: metadata.onlineFee,
  totalToPayNow: metadata.totalToPayNow,
  remainingBalance: metadata.remainingBalance,

  date: metadata.date,
  time: metadata.time,
  notes: metadata.notes || "",

  paymongoReference:
    checkoutSession?.id ||
    checkoutAttributes?.reference_number ||
    checkoutAttributes?.payment_intent?.id ||
    "",
};

    console.log("SENDING BOOKING TO GOOGLE CALENDAR:", bookingPayload);

    const calendarResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingPayload),
    });

    const calendarText = await calendarResponse.text();

    console.log("GOOGLE CALENDAR RESPONSE:", calendarText);

    if (!calendarResponse.ok) {
      return response.status(500).json({
        error: "Google Calendar booking failed.",
        details: calendarText,
      });
    }

    return response.status(200).json({
      received: true,
      paid: true,
      calendar: calendarText,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return response.status(500).json({
      error: "Webhook handler failed.",
    });
  }
}