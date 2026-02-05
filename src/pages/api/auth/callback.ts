import type { APIRoute } from "astro";
import { supabaseClient } from "../../../lib/supabase";

const sanitizeReturnTo = (value: string | null): string => {
  const fallback = "/";
  if (!value) return fallback;
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
};

export const GET: APIRoute = async ({ request, cookies, redirect, url }) => {
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const returnToCookie = cookies.get("sb-return-to")?.value ?? "/";
  const returnTo = sanitizeReturnTo(returnToCookie);

  cookies.delete("sb-return-to", { path: "/" });

  if (oauthError || !code) {
    return redirect(`/signin?error=oauth&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    return redirect(`/signin?error=oauth&returnTo=${encodeURIComponent(returnTo)}`);
  }

  const { access_token, refresh_token } = data.session;
  cookies.set("sb-access-token", access_token, {
    path: "/",
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
  });

  return redirect(returnTo);
};
