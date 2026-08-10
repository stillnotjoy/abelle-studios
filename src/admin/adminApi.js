import { supabase } from "../lib/supabaseClient";

export async function adminFetch(
  input,
  options = {}
) {
  const {
    data,
    error,
  } = await supabase.auth.getSession();

  const accessToken =
    data?.session?.access_token;

  if (error || !accessToken) {
    throw new Error(
      "Your admin session has expired. Please sign in again."
    );
  }

  const headers = new Headers(
    options.headers || {}
  );

  headers.set(
    "Authorization",
    `Bearer ${accessToken}`
  );

  return fetch(input, {
    ...options,
    headers,
  });
}
