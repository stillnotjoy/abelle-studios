// api/create-checkout.js

const PACKAGE_PRICES = {
  "Personal Portraits": 499,
  "Duo Portraits": 899,
  "Barkada Shoot": 999,
  "Family Portrait": 1299,
};

const DISCOUNT_CODE = "ABELLE100";
const DISCOUNT_AMOUNT = 100;

async function saveCheckoutAttempt(attempt) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Supabase env vars missing. Checkout attempt was not saved.");
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/checkout_attempts`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(attempt),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Supabase checkout attempt save error:", errorText);
  }
}

function getBookingReference(date, time) {
  const cleanDate = String(date || "").replaceAll("-", "");
  const cleanTime = String(time || "").replace(":", "");
  return `ABELLE-${cleanDate}-${cleanTime}`;
}

function getPaymentDetails(packageTitle, paymentOption, discountCode) {
  const packagePrice = PACKAGE_PRICES[packageTitle];

  if (!packagePrice) {
    throw new Error("Invalid package selected.");
  }

  if (paymentOption !== "full_online") {
    throw new Error("This checkout route only supports full online payments.");
  }

  const cleanDiscountCode = String(discountCode || "").trim().toUpperCase();
const hasDiscount = cleanDiscountCode === DISCOUNT_CODE;

const amount = hasDiscount
  ? Math.max(packagePrice - DISCOUNT_AMOUNT, 0)
  : packagePrice;

const discountAmount = hasDiscount ? DISCOUNT_AMOUNT : 0;

  return {
    amount,
    remainingBalance: 0,
   discountCode: hasDiscount ? DISCOUNT_CODE : "",
discountAmount,
label: hasDiscount
  ? `${packageTitle} - Discounted Full Payment`
  : `${packageTitle} - Full Payment`,
description: hasDiscount
  ? `Discounted full payment for ${packageTitle} booking`
  : `Full payment for ${packageTitle} booking`,
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
      discountCode,
      notes,
    } = req.body || {};

    if (
      !name ||
      !email ||
      !phone ||
      !packageTitle ||
      !date ||
      !time ||
      !paymentOption
    ) {
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

    const paymentDetails = getPaymentDetails(
      packageTitle,
      paymentOption,
      discountCode
    );

    const packagePrice = PACKAGE_PRICES[packageTitle];

    const response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${secretKey}:`).toString("base64"),
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
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            description:
paymentDetails.discountCode === DISCOUNT_CODE
                ? "Test discounted Abelle Studios booking. Online processing fees are added at checkout."
                : "Secure your Abelle Studios booking. Online processing fees are added at checkout.",
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
              packagePrice: String(packagePrice),
              amountToPay: String(paymentDetails.amount),
              remainingBalance: String(paymentDetails.remainingBalance),
              discountCode: paymentDetails.discountCode,
              discountAmount: String(paymentDetails.discountAmount),
              notes: notes || "",
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

    const checkoutSessionId = data.data.id;
    const checkoutUrl = data.data.attributes.checkout_url;

    const discountNote =
  paymentDetails.discountCode === DISCOUNT_CODE
    ? `Discount code ${DISCOUNT_CODE} applied. Original price: ₱${packagePrice}. Discount: ₱${paymentDetails.discountAmount}. Amount paid: ₱${paymentDetails.amount}.`
    : "";

    await saveCheckoutAttempt({
      booking_reference: bookingReference,
      checkout_session_id: checkoutSessionId,
      checkout_url: checkoutUrl,
      status: "STARTED",

      client_name: name,
      email,
      phone,

      package_title: packageTitle,
      shoot_date: date,
      shoot_time: time,

      payment_option: paymentOption,
      package_price: packagePrice,
      amount_to_pay: paymentDetails.amount,
      remaining_balance: paymentDetails.remainingBalance,

      notes: [notes || "", discountNote].filter(Boolean).join(" | "),
    });

    return res.status(200).json({
      bookingReference,
      checkoutSessionId,
      checkoutUrl,
      amountToPay: paymentDetails.amount,
      remainingBalance: paymentDetails.remainingBalance,
      discountCode: paymentDetails.discountCode,
      discountAmount: paymentDetails.discountAmount,
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    return res.status(500).json({
      error: error.message || "Something went wrong.",
    });
  }
}