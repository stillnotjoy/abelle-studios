const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function sendJson(response, status, data) {
  return response.status(status).json(data);
}

function getBearerToken(request) {
  const authorization = String(
    request.headers.authorization || ""
  ).trim();

  const match = authorization.match(
    /^Bearer\s+(.+)$/i
  );

  return match ? match[1].trim() : "";
}

export async function requireAdmin(
  request,
  response
) {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    sendJson(response, 500, {
      error:
        "Admin authentication is not configured.",
    });

    return null;
  }

  const accessToken =
    getBearerToken(request);

  if (!accessToken) {
    sendJson(response, 401, {
      error:
        "Your admin session is missing. Please sign in again.",
    });

    return null;
  }

  const userResponse = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey:
          SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${accessToken}`,
      },
    }
  );

  if (!userResponse.ok) {
    sendJson(response, 401, {
      error:
        "Your admin session has expired. Please sign in again.",
    });

    return null;
  }

  const user =
    await userResponse.json();

  const isAdmin =
    user?.app_metadata?.role ===
      "admin" ||
    user?.app_metadata?.is_admin ===
      true;

  if (!isAdmin) {
    sendJson(response, 403, {
      error:
        "This login does not have administrator access.",
    });

    return null;
  }

  return user;
}
