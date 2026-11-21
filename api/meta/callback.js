/* global process */

import { createClient } from "@supabase/supabase-js";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI =
  process.env.META_REDIRECT_URI ||
  "https://abellestudios.xyz/api/meta/callback";

function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.BASE_URL ||
    process.env.URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || "";

  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  const target = cookies.find((cookie) =>
    cookie.startsWith(`${name}=`)
  );

  if (!target) return null;

  return decodeURIComponent(target.slice(name.length + 1));
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      error: "Method not allowed.",
    });
  }

  const error = String(request.query.error || "");
  const errorDescription = String(
    request.query.error_description || ""
  );

  if (error) {
    return response.status(400).json({
      error,
      details: errorDescription || "Meta connection was cancelled.",
    });
  }

  const code = String(request.query.code || "");
  const state = String(request.query.state || "");
  const savedState = getCookie(request, "meta_oauth_state");

  if (!code) {
    return response.status(400).json({
      error: "Missing OAuth code.",
    });
  }

  if (!state || !savedState || state !== savedState) {
    return response.status(400).json({
      error: "Invalid OAuth state.",
    });
  }

  if (!META_APP_ID || !META_APP_SECRET) {
    return response.status(500).json({
      error: "Meta app credentials are not configured.",
    });
  }

  try {
    const tokenUrl = new URL(
      "https://graph.facebook.com/v26.0/oauth/access_token"
    );

    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set(
      "redirect_uri",
      META_REDIRECT_URI
    );
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenPayload = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      console.error("Meta token exchange failed:", tokenPayload);

      return response.status(400).json({
        error: "Could not exchange Meta OAuth code.",
      });
    }

    const userAccessToken = tokenPayload.access_token;

    const accountsUrl = new URL(
      "https://graph.facebook.com/v26.0/me/accounts"
    );

    accountsUrl.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account"
    );

    accountsUrl.searchParams.set(
      "access_token",
      userAccessToken
    );

    const accountsResponse = await fetch(
      accountsUrl.toString()
    );

    const accountsPayload = await accountsResponse.json();

    if (!accountsResponse.ok) {
      console.error(
        "Meta account fetch failed:",
        accountsPayload
      );

      return response.status(400).json({
        error: "Could not load Meta Pages.",
      });
    }

    const abellePage = (accountsPayload.data || []).find(
      (page) =>
        String(page.id) === "254698671071327"
    );

    if (!abellePage) {
      return response.status(400).json({
        error: "Abelle Studios Page was not found.",
      });
    }

    const instagramAccountId =
      abellePage.instagram_business_account?.id || null;

    const supabase = getSupabaseClient();

    const { error: upsertError } = await supabase
      .from("social_accounts")
      .upsert(
        {
          provider: "meta",
          facebook_page_id: abellePage.id,
          facebook_page_name: abellePage.name,
          instagram_account_id: instagramAccountId,
          page_access_token: abellePage.access_token,
          connected_at: new Date().toISOString(),
          is_active: true,
        },
        {
          onConflict: "provider",
        }
      );

    if (upsertError) {
      console.error(
        "Could not save Meta connection:",
        upsertError
      );

      return response.status(500).json({
        error: "Could not save Meta connection.",
      });
    }

    response.setHeader(
      "Set-Cookie",
      "meta_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );

    return response.redirect(
      302,
      "/admin?meta=connected"
    );
  } catch (error) {
    console.error("Meta OAuth callback failed:", error);

    return response.status(500).json({
      error: "Meta connection failed.",
      details: error.message,
    });
  }
}