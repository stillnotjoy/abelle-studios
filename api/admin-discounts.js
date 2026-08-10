import { requireAdmin } from "../server/adminAuth.js";

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
      Prefer: "return=representation",
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

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    if (req.method === "GET") {
      const discounts = await supabaseRequest(
        "discount_codes?select=*&order=created_at.desc"
      );

      return sendJson(res, 200, {
        discounts: discounts || [],
      });
    }

    if (req.method === "POST") {
      const {
        code,
        description,
        discountType,
        discountValue,
        isActive,
        startsAt,
        endsAt,
        maxTotalUses,
        oneUsePerCustomer,
      } = req.body || {};

      const cleanCode = normalizeCode(code);
      const cleanDiscountType = String(discountType || "").trim();

      if (!cleanCode) {
        return sendJson(res, 400, {
          error: "Discount code is required.",
        });
      }

      if (!["fixed", "percent"].includes(cleanDiscountType)) {
        return sendJson(res, 400, {
          error: "Discount type must be fixed or percent.",
        });
      }

      const numericDiscountValue = Number(discountValue);

      if (!numericDiscountValue || numericDiscountValue <= 0) {
        return sendJson(res, 400, {
          error: "Discount value must be greater than 0.",
        });
      }

      if (cleanDiscountType === "percent" && numericDiscountValue > 100) {
        return sendJson(res, 400, {
          error: "Percentage discount cannot be more than 100.",
        });
      }

      const payload = {
        code: cleanCode,
        description: description || "",
        discount_type: cleanDiscountType,
        discount_value: numericDiscountValue,
        is_active: Boolean(isActive),
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        max_total_uses: maxTotalUses ? Number(maxTotalUses) : null,
        one_use_per_customer: Boolean(oneUsePerCustomer),
      };

      const created = await supabaseRequest("discount_codes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return sendJson(res, 200, {
        discount: created?.[0] || null,
      });
    }

    return sendJson(res, 405, {
      error: "Method not allowed.",
    });
  } catch (error) {
    console.error("Admin discounts API error:", error);

    return sendJson(res, 500, {
      error: error.message || "Something went wrong.",
    });
  }
}
