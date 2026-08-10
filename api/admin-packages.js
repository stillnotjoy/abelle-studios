import { requireAdmin } from "../server/adminAuth.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(res, status, data) {
  res.status(status).json(data);
}

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
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

function cleanText(value) {
  return String(value || "").trim();
}

function validatePackageFields(body) {
  const {
    name,
    defaultPrice,
    defaultDeposit,
    durationMinutes,
    displayOrder,
  } = body;

  const cleanName = cleanText(name);
  const price = Number(defaultPrice);
  const deposit = Number(defaultDeposit || 0);
  const duration = Number(durationMinutes || 60);
  const order = Number(displayOrder || 0);

  if (!cleanName) {
    return {
      error: "Package name is required.",
    };
  }

  if (!Number.isFinite(price) || price < 0) {
    return {
      error: "Package price must be 0 or higher.",
    };
  }

  if (!Number.isFinite(deposit) || deposit < 0) {
    return {
      error: "Deposit must be 0 or higher.",
    };
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return {
      error: "Duration must be greater than 0.",
    };
  }

  if (!Number.isFinite(order) || order < 0) {
    return {
      error: "Display order must be 0 or higher.",
    };
  }

  return {
    cleanName,
    price,
    deposit,
    duration,
    order,
  };
}

function buildPackagePayload(body) {
  const validation = validatePackageFields(body);

  if (validation.error) {
    return validation;
  }

  const {
    description,
    inclusions,
    imageUrl,
    color,
    isActive,
  } = body;

  return {
    payload: {
      name: validation.cleanName,
      description: cleanText(description),
      default_price: validation.price,
      default_deposit: validation.deposit,
      duration_minutes: validation.duration,
      inclusions: cleanText(inclusions),
      image_url: cleanText(imageUrl) || null,
      color: cleanText(color) || "#4F46E5",
      is_active: isActive !== false,
      display_order: validation.order,
    },
  };
}

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    if (req.method === "GET") {
      const packages = await supabaseRequest(
        "abelle_packages?select=*&order=display_order.asc,name.asc"
      );

      return sendJson(res, 200, {
        packages: packages || [],
      });
    }

    if (req.method === "POST") {
      const result = buildPackagePayload(req.body || {});

      if (result.error) {
        return sendJson(res, 400, {
          error: result.error,
        });
      }

      const created = await supabaseRequest(
        "abelle_packages",
        {
          method: "POST",
          body: JSON.stringify(result.payload),
        }
      );

      return sendJson(res, 201, {
        package: created?.[0] || null,
      });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const { id } = body;

      if (!id) {
        return sendJson(res, 400, {
          error: "Package ID is required.",
        });
      }

      const isStatusOnlyUpdate =
        Object.prototype.hasOwnProperty.call(
          body,
          "isActive"
        ) &&
        !Object.prototype.hasOwnProperty.call(body, "name");

      let payload;

      if (isStatusOnlyUpdate) {
        payload = {
          is_active: Boolean(body.isActive),
        };
      } else {
        const result = buildPackagePayload(body);

        if (result.error) {
          return sendJson(res, 400, {
            error: result.error,
          });
        }

        payload = result.payload;
      }

      const updated = await supabaseRequest(
        `abelle_packages?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      if (!updated?.length) {
        return sendJson(res, 404, {
          error: "Package not found.",
        });
      }

      return sendJson(res, 200, {
        package: updated[0],
      });
    }
    if (req.method === "DELETE") {
      const { id } = req.body || {};

      if (!id) {
        return sendJson(res, 400, {
          error: "Package ID is required.",
        });
      }

      const encodedId = encodeURIComponent(id);

      const relatedBookings = await supabaseRequest(
        `abelle_bookings?select=id&package_id=eq.${encodedId}&limit=1`
      );

      if (relatedBookings?.length > 0) {
        return sendJson(res, 409, {
          error:
            "This package already has booking history and cannot be deleted. Disable it instead.",
        });
      }

      const deleted = await supabaseRequest(
        `abelle_packages?id=eq.${encodedId}`,
        {
          method: "DELETE",
        }
      );

      if (!deleted?.length) {
        return sendJson(res, 404, {
          error: "Package not found.",
        });
      }

      return sendJson(res, 200, {
        success: true,
        package: deleted[0],
        message: "Package deleted successfully.",
      });
    }
    return sendJson(res, 405, {
      error: "Method not allowed.",
    });
  } catch (error) {
    console.error("Admin packages API error:", error);

    return sendJson(res, 500, {
      error: error.message || "Something went wrong.",
    });
  }
}
