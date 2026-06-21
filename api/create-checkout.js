// api/create-checkout.js

const PACKAGE_PRICES = {
  "Personal Portraits": 499,
  "Duo Portraits": 899,
  "Barkada Shoot": 999,
  "Family Portrait": 1299,
};

function getBookingReference(date, time) {
  const cleanDate = String(date || "").replaceAll("-", "");
  const cleanTime = String(time || "").replace(":", "");
  return `ABELLE-${cleanDate}-${cleanTime}`;
}

function getPaymentDetails(packageTitle, paymentOption) {
  const packagePrice = PACKAGE_PRICES[packageTitle];

  if (!packagePrice) {
    throw new Error("Invalid package selected.");
  }

  if (paymentOption !== "full_online") {
    throw new Error("This checkout route only supports full online payments.");
  }

  return {
    amount: packagePrice,
    remainingBalance: 0,
    label: `${packageTitle} - Full Payment`,
    description: `Full payment for ${packageTitle} booking`,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      name,
      email,
      phone,
      packageTitle,
      date,
      time,
      paymentOption,
    } = req.body || {};

    if (!name || !email || !phone || !packageTitle || !date || !time || !paymentOption) {
      return res.status(400).json({
        error: "Missing required booking details.",
      });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      return res.status(500).json({
        error: "Missing PAYMONGO_SECRET_KEY environment variable.",
      });
    }

    const siteUrl = process.env.SITE_URL || "https://www.abellestudios.xyz";
    const bookingReference = getBookingReference(date, time);
    const paymentDetails = getPaymentDetails(packageTitle, paymentOption);

    const response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${secretKey}:`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                currency: "PHP",
                amount: paymentDetails.amount * 100,
                name: paymentDetails.label,
                quantity: 1,
                description: paymentDetails.description,
              },
            ],
            payment_method_types: ["qrph"],
            pass_on_fees: true,
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description:
              "Secure your Abelle Studios booking. Online processing fees are added at checkout.",
            reference_number: bookingReference,
            customer_email: email,
            billing: {
              name,
              email,
              phone,
            },
            success_url: `${siteUrl}/?booking=success&ref=${bookingReference}`,
            cancel_url: `${siteUrl}/?booking=cancelled&ref=${bookingReference}`,
            metadata: {
              bookingReference,
              name,
              email,
              phone,
              packageTitle,
              shootDate: date,
              shootTime: time,
              paymentOption,
              packagePrice: String(PACKAGE_PRICES[packageTitle]),
              amountToPay: String(paymentDetails.amount),
              remainingBalance: String(paymentDetails.remainingBalance),
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("PayMongo checkout error:", JSON.stringify(data, null, 2));
      return res.status(response.status).json({
        error: "Unable to create PayMongo checkout session.",
        details: data,
      });
    }

    return res.status(200).json({
      bookingReference,
      checkoutSessionId: data.data.id,
      checkoutUrl: data.data.attributes.checkout_url,
      amountToPay: paymentDetails.amount,
      remainingBalance: paymentDetails.remainingBalance,
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    return res.status(500).json({
      error: error.message || "Something went wrong.",
    });
  }
}