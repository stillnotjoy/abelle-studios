export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      packageTitle,
      packagePrice,
      amountDueToday,
      onlineFee,
      totalToPayNow,
      remainingBalance,
      date,
      time,
      name,
      phone,
      email,
      notes,
    } = request.body;

    if (!name || !phone || !email || !date || !time || !totalToPayNow) {
      return response.status(400).json({
        error: "Missing required booking details.",
      });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      return response.status(500).json({
        error: "Missing PAYMONGO_SECRET_KEY environment variable.",
      });
    }

    const siteUrl =
      process.env.SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const encodedKey = Buffer.from(`${secretKey}:`).toString("base64");

    const checkoutResponse = await fetch(
      "https://api.paymongo.com/v2/checkout_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              description: `Abelle Studios booking for ${name}`,
              payment_method_types: ["card", "gcash", "paymaya"],
              success_url: `${siteUrl}/?payment=success`,
              cancel_url: `${siteUrl}/?payment=cancelled`,
              line_items: [
                {
                  currency: "PHP",
                  amount: Math.round(Number(totalToPayNow) * 100),
                  name: `Abelle Studios - ${packageTitle}`,
                  quantity: 1,
                  description: `Booking payment for ${date} at ${time}`,
                },
              ],
              metadata: {
                source: "abelle_studios_website",
                packageTitle: String(packageTitle),
                packagePrice: String(packagePrice),
                amountDueToday: String(amountDueToday),
                onlineFee: String(onlineFee),
                totalToPayNow: String(totalToPayNow),
                remainingBalance: String(remainingBalance),
                date: String(date),
                time: String(time),
                name: String(name),
                phone: String(phone),
                email: String(email),
                notes: notes ? String(notes) : "",
              },
            },
          },
        }),
      }
    );

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
      console.error("PayMongo error:", JSON.stringify(checkoutData, null, 2));

      return response.status(500).json({
        error: "Could not create PayMongo checkout.",
        details: checkoutData,
      });
    }

    const checkoutUrl = checkoutData?.data?.attributes?.checkout_url;

    if (!checkoutUrl) {
      return response.status(500).json({
        error: "PayMongo did not return a checkout URL.",
        details: checkoutData,
      });
    }

    return response.status(200).json({
      checkoutUrl,
    });
  } catch (error) {
    console.error("Checkout server error:", error);

    return response.status(500).json({
      error: "Something went wrong while creating checkout.",
    });
  }
}