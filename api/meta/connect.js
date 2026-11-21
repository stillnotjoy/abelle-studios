/* global process */

import crypto from "crypto";
import { requireAdmin } from "../../server/adminAuth.js";

const META_APP_ID = process.env.META_APP_ID;
const META_REDIRECT_URI =
  process.env.META_REDIRECT_URI ||
  "https://abellestudios.xyz/api/meta/callback";

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");

    return response.status(405).json({
      error: "Method not allowed.",
    });
  }

  if (!(await requireAdmin(request, response))) return;

  if (!META_APP_ID) {
    return response.status(500).json({
      error: "META_APP_ID is not configured.",
    });
  }

  const state = crypto.randomBytes(24).toString("hex");

  response.setHeader(
    "Set-Cookie",
    `meta_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_id: META_APP_ID,
    redirect_uri: META_REDIRECT_URI,
    state,
    response_type: "code",
    scope: META_SCOPES.join(","),
  });

  const authorizationUrl =
    `https://www.facebook.com/v26.0/dialog/oauth?${params.toString()}`;

  return response.redirect(302, authorizationUrl);
}