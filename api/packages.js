const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(res, status, data) {
  res.status(status).json(data);
}

async function supabaseRequest(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
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
    console.error("Supabase packages API error:", data);

    throw new Error(
      typeof data === "object" && data?.message
        ? data.message
        : "Could not load packages."
    );
  }

  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return sendJson(res, 405, {
        error: "Method not allowed.",
      });
    }

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
          "inclusions",
          "image_url",
          "color",
          "display_order",
        ].join(","),
        "&is_active=eq.true",
        "&order=display_order.asc,name.asc",
      ].join("")
    );

    return sendJson(res, 200, {
      packages: packages || [],
    });
  } catch (error) {
    console.error("Public packages API error:", error);

    return sendJson(res, 500, {
      error:
        error.message ||
        "Something went wrong while loading packages.",
    });
  }
}