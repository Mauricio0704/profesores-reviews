import type { APIRoute } from "astro";
import { supabaseClient } from "~/lib/supabase";

const sanitizeReturnTo = (value: string | null): string => {
  const fallback = "/";
  if (!value) return fallback;
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
};

const resolveOrigin = (request: Request, url: URL): string => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() || "https";
    const host = forwardedHost.split(",")[0].trim();
    return `${proto}://${host}`;
  }

  const host = request.headers.get("host");
  if (host) {
    const proto = forwardedProto?.split(",")[0]?.trim()
      || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return url.origin;
};

export const GET: APIRoute = async ({ request, cookies, redirect, url }) => {
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));
  const origin = resolveOrigin(request, new URL(request.url));
  const redirectTo = `${origin}/api/auth/callback`;

  cookies.set("sb-return-to", returnTo, {
    path: "/",
    maxAge: 60 * 10,
  });

  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error || !data?.url) {
    return new Response("Failed to start Google OAuth", { status: 500 });
  }

  return redirect(data.url);
};
