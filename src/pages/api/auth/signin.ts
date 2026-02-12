import type { APIRoute } from "astro";
import { supabaseClient } from "~/lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const returnToParam = formData.get("returnTo")?.toString() ?? "/";
  const returnTo = returnToParam.startsWith("/") && !returnToParam.startsWith("//")
    ? returnToParam
    : "/";

  if (!email || !password) {
    return new Response("Email and password are required", { status: 400 });
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(`/signin?error=invalid&returnTo=${encodeURIComponent(returnTo)}`);
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