const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(res, status, data) {
  res.status(status).json(data);
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

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

function calculateDiscountAmount(discount, packagePrice) {
  const value = Number(discount.discount_value || 0);

  if (discount.discount_type === "fixed") {
    return Math.min(value, packagePrice);
  }

  if (discount.discount_type === "percent") {
    return Math.round(packagePrice * (value / 100));
  }

  return 0;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return sendJson(res, 405, {
        valid: false,
        error: "Method not allowed.",
      });
    }

    const { code, packagePrice } = req.body || {};

    const cleanCode = normalizeCode(code);
    const numericPackagePrice = Number(packagePrice || 0);

    if (!cleanCode) {
      return sendJson(res, 200, {
        valid: false,
        error: "Please enter a discount code.",
      });
    }

    if (!numericPackagePrice || numericPackagePrice <= 0) {
      return sendJson(res, 400, {
        valid: false,
        error: "Invalid package price.",
      });
    }

    const encodedCode = encodeURIComponent(cleanCode);

    const discounts = await supabaseRequest(
      `discount_codes?code=eq.${encodedCode}&select=*&limit=1`
    );

    const discount = discounts?.[0];

    if (!discount) {
      return sendJson(res, 200, {
        valid: false,
        error: "Discount code not found.",
      });
    }

    if (!discount.is_active) {
      return sendJson(res, 200, {
        valid: false,
        error: "This discount code is inactive.",
      });
    }

    const now = new Date();

if (discount.starts_at) {
  const startDate = new Date(discount.starts_at);

  startDate.setHours(0, 0, 0, 0);

  if (startDate > now) {
    return sendJson(res, 200, {
      valid: false,
      error: "This discount code is not active yet.",
    });
  }
}

if (discount.ends_at) {
  const endDate = new Date(discount.ends_at);

  endDate.setHours(23, 59, 59, 999);

  if (endDate < now) {
    return sendJson(res, 200, {
      valid: false,
      error: "This discount code has expired.",
    });
  }
}

    const discountAmount = calculateDiscountAmount(discount, numericPackagePrice);

    if (discountAmount <= 0) {
      return sendJson(res, 200, {
        valid: false,
        error: "This discount code could not be applied.",
      });
    }

    return sendJson(res, 200, {
      valid: true,
      code: discount.code,
      discountType: discount.discount_type,
      discountValue: Number(discount.discount_value),
      discountAmount,
      message:
        discount.discount_type === "fixed"
          ? `₱${discountAmount.toLocaleString()} discount applied.`
          : `${Number(discount.discount_value)}% discount applied.`,
    });
  } catch (error) {
    console.error("Validate discount error:", error);

    return sendJson(res, 500, {
      valid: false,
      error: error.message || "Could not validate discount code.",
    });
  }
}