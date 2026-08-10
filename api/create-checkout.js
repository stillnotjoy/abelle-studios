// api/create-checkout.js

import { createOnlineBookingReference } from "../lib/booking-reference.js";

function sendJson(res, status, data) {
  return res.status(status).json(data);
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeCode(code) {
  return cleanText(code).toUpperCase();
}

async function supabaseRequest(path, options = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    console.error("Supabase API error:", data);

    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : "Supabase request failed."
    );
  }

  return data;
}

async function getPackageFromSupabase(packageId) {
  const encodedPackageId =
    encodeURIComponent(packageId);

  const packages = await supabaseRequest(
    [
      "abelle_packages",
      "?select=",
      [
        "id",
        "name",
        "description",
        "default_price",
        "default_deposit",
        "duration_minutes",
        "is_active",
      ].join(","),
      `&id=eq.${encodedPackageId}`,
      "&limit=1",
    ].join("")
  );

  return Array.isArray(packages)
    ? packages[0] || null
    : null;
}

async function saveCheckoutAttempt(attempt) {
  const supabaseUrl = process.env.SUPABASE_URL;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error(
      "Supabase environment variables are missing. Checkout attempt was not saved."
    );

    return;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/checkout_attempts`,
    {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(attempt),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "Supabase checkout attempt save error:",
      errorText
    );
  }
}

function calculateDiscountAmount(
  discount,
  packagePrice
) {
  const value = Number(
    discount.discount_value || 0
  );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0;
  }

  if (discount.discount_type === "fixed") {
    return Math.min(value, packagePrice);
  }

  if (discount.discount_type === "percent") {
    return Math.min(
      Math.round(packagePrice * (value / 100)),
      packagePrice
    );
  }

  return 0;
}

async function validateDiscountCode(
  discountCode,
  packagePrice
) {
  const cleanCode = normalizeCode(discountCode);

  if (!cleanCode) {
    return {
      valid: false,
      code: "",
      discountAmount: 0,
    };
  }

  const encodedCode =
    encodeURIComponent(cleanCode);

  const discounts = await supabaseRequest(
    `discount_codes?code=eq.${encodedCode}&select=*&limit=1`
  );

  const discount = discounts?.[0];

  if (!discount) {
    throw new Error(
      "Discount code not found."
    );
  }

  if (!discount.is_active) {
    throw new Error(
      "This discount code is inactive."
    );
  }

  const now = new Date();

  if (discount.starts_at) {
    const startDate = new Date(
      discount.starts_at
    );

    startDate.setHours(0, 0, 0, 0);

    if (startDate > now) {
      throw new Error(
        "This discount code is not active yet."
      );
    }
  }

  if (discount.ends_at) {
    const endDate = new Date(
      discount.ends_at
    );

    endDate.setHours(23, 59, 59, 999);

    if (endDate < now) {
      throw new Error(
        "This discount code has expired."
      );
    }
  }

  const discountAmount =
    calculateDiscountAmount(
      discount,
      packagePrice
    );

  if (discountAmount <= 0) {
    throw new Error(
      "This discount code could not be applied."
    );
  }

  return {
    valid: true,
    code: discount.code,
    discountType:
      discount.discount_type,
    discountValue: Number(
      discount.discount_value
    ),
    discountAmount,
  };
}

async function getPaymentDetails(
  selectedPackage,
  paymentOption,
  discountCode
) {
  if (!selectedPackage) {
    throw new Error(
      "The selected package could not be found."
    );
  }

  if (!selectedPackage.is_active) {
    throw new Error(
      "This package is no longer available for booking. Please choose another package."
    );
  }

  if (paymentOption !== "full_online") {
    throw new Error(
      "This checkout route only supports full online payments."
    );
  }

  const packagePrice = Number(
    selectedPackage.default_price
  );

  if (
    !Number.isFinite(packagePrice) ||
    packagePrice <= 0
  ) {
    throw new Error(
      "The selected package has an invalid price."
    );
  }

  const discountResult =
    await validateDiscountCode(
      discountCode,
      packagePrice
    );

  const amount = Math.max(
    packagePrice -
      discountResult.discountAmount,
    0
  );

  if (amount <= 0) {
    throw new Error(
      "This discount reduces the payment to zero. Please contact Abelle Studios to complete this booking."
    );
  }

  const packageTitle =
    selectedPackage.name;

  return {
    packageId: selectedPackage.id,
    packageTitle,
    packageDescription:
      selectedPackage.description || "",
    packagePrice,
    amount,
    remainingBalance: 0,
    durationMinutes: Number(
      selectedPackage.duration_minutes || 60
    ),
    defaultDeposit: Number(
      selectedPackage.default_deposit || 0
    ),
    discountCode: discountResult.valid
      ? discountResult.code
      : "",
    discountAmount: discountResult.valid
      ? discountResult.discountAmount
      : 0,
    label: discountResult.valid
      ? `${packageTitle} - Discounted Full Payment`
      : `${packageTitle} - Full Payment`,
    description: discountResult.valid
      ? `Discounted full payment for ${packageTitle} booking`
      : `Full payment for ${packageTitle} booking`,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      error: "Method not allowed.",
    });
  }

  try {
    const body = req.body || {};

    const name = cleanText(body.name);
    const email = cleanText(body.email);
    const phone = cleanText(body.phone);
    const packageId = cleanText(
      body.packageId
    );
    const date = cleanText(body.date);
    const time = cleanText(body.time);
    const paymentOption = cleanText(
      body.paymentOption
    );
    const discountCode = cleanText(
      body.discountCode
    );
    const notes = cleanText(body.notes);

    if (
      !name ||
      !email ||
      !phone ||
      !packageId ||
      !date ||
      !time ||
      !paymentOption
    ) {
      return sendJson(res, 400, {
        error:
          "Missing required booking details.",
      });
    }

    const secretKey =
      process.env.PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      return sendJson(res, 500, {
        error:
          "Missing PAYMONGO_SECRET_KEY environment variable.",
      });
    }

    const selectedPackage =
      await getPackageFromSupabase(
        packageId
      );

    if (!selectedPackage) {
      return sendJson(res, 404, {
        error:
          "The selected package could not be found.",
      });
    }

    const paymentDetails =
      await getPaymentDetails(
        selectedPackage,
        paymentOption,
        discountCode
      );

    const siteUrl =
      process.env.SITE_URL ||
      "https://www.abellestudios.xyz";

    const bookingReference =
      createOnlineBookingReference(
        date,
        selectedPackage.name
      );

    const paymongoResponse = await fetch(
      "https://api.paymongo.com/v2/checkout_sessions",
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${secretKey}:`
            ).toString("base64"),
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [
                {
                  currency: "PHP",
                  amount:
                    paymentDetails.amount *
                    100,
                  name:
                    paymentDetails.label,
                  quantity: 1,
                  description:
                    paymentDetails.description,
                },
              ],

              payment_method_types: [
                "qrph",
              ],

              pass_on_fees: true,

              send_email_receipt: false,
              show_description: true,
              show_line_items: true,

              description:
                paymentDetails.discountAmount >
                0
                  ? "Discounted Abelle Studios booking. Online processing fees are added at checkout."
                  : "Secure your Abelle Studios booking. Online processing fees are added at checkout.",

              reference_number:
                bookingReference,

              customer_email: email,

              billing: {
                name,
                email,
                phone,
              },

              success_url:
                `${siteUrl}/?booking=success` +
                `&ref=${encodeURIComponent(
                  bookingReference
                )}`,

              cancel_url:
                `${siteUrl}/?booking=cancelled` +
                `&ref=${encodeURIComponent(
                  bookingReference
                )}`,

              metadata: {
                bookingReference,

                name,
                email,
                phone,

                packageId:
                  paymentDetails.packageId,

                packageTitle:
                  paymentDetails.packageTitle,

                packageDescription:
                  paymentDetails.packageDescription,

                shootDate: date,
                shootTime: time,

                paymentOption,

                packagePrice: String(
                  paymentDetails.packagePrice
                ),

                amountToPay: String(
                  paymentDetails.amount
                ),

                remainingBalance: String(
                  paymentDetails.remainingBalance
                ),

                defaultDeposit: String(
                  paymentDetails.defaultDeposit
                ),

                durationMinutes: String(
                  paymentDetails.durationMinutes
                ),

                discountCode:
                  paymentDetails.discountCode,

                discountAmount: String(
                  paymentDetails.discountAmount
                ),

                notes,
              },
            },
          },
        }),
      }
    );

    const responseText =
      await paymongoResponse.text();

    let data = {};

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      console.error(
        "PayMongo returned non-JSON:",
        responseText
      );

      return sendJson(res, 500, {
        error:
          "PayMongo returned an invalid response.",
      });
    }

    if (!paymongoResponse.ok) {
      console.error(
        "PayMongo checkout error:",
        JSON.stringify(data, null, 2)
      );

      return sendJson(
        res,
        paymongoResponse.status,
        {
          error:
            "Unable to create PayMongo checkout session.",
          details: data,
        }
      );
    }

    const checkoutSessionId =
      data?.data?.id;

    const checkoutUrl =
      data?.data?.attributes?.checkout_url;

    if (
      !checkoutSessionId ||
      !checkoutUrl
    ) {
      console.error(
        "PayMongo response missing checkout details:",
        data
      );

      return sendJson(res, 500, {
        error:
          "PayMongo did not return a valid checkout link.",
      });
    }

    const discountNote =
      paymentDetails.discountAmount > 0
        ? [
            `Discount code ${paymentDetails.discountCode} applied.`,
            `Original price: ₱${paymentDetails.packagePrice}.`,
            `Discount: ₱${paymentDetails.discountAmount}.`,
            `Amount paid before processing fee: ₱${paymentDetails.amount}.`,
          ].join(" ")
        : "";

    await saveCheckoutAttempt({
      booking_reference:
        bookingReference,

      checkout_session_id:
        checkoutSessionId,

      checkout_url: checkoutUrl,

      status: "STARTED",

      client_name: name,
      email,
      phone,

      package_title:
        paymentDetails.packageTitle,

      shoot_date: date,
      shoot_time: time,

      payment_option:
        paymentOption,

      package_price:
        paymentDetails.packagePrice,

      amount_to_pay:
        paymentDetails.amount,

      remaining_balance:
        paymentDetails.remainingBalance,

      notes: [
        notes,
        discountNote,
      ]
        .filter(Boolean)
        .join(" | "),
    });

    return sendJson(res, 200, {
      bookingReference,
      checkoutSessionId,
      checkoutUrl,

      packageId:
        paymentDetails.packageId,

      packageTitle:
        paymentDetails.packageTitle,

      packagePrice:
        paymentDetails.packagePrice,

      amountToPay:
        paymentDetails.amount,

      remainingBalance:
        paymentDetails.remainingBalance,

      discountCode:
        paymentDetails.discountCode,

      discountAmount:
        paymentDetails.discountAmount,
    });
  } catch (error) {
    console.error(
      "Create checkout error:",
      error
    );

    return sendJson(res, 500, {
      error:
        error.message ||
        "Something went wrong.",
    });
  }
}
