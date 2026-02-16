import type { APIRoute } from "astro";
import { supabaseClient } from "~/lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return new Response("Se requieren email y contraseña", { status: 400 });
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  if (!data.session) {
    const signIn = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signIn.error || !signIn.data.session) {
      return new Response("Cuenta creada pero fallo el inicio de sesión", { status: 500 });
    }

    const { access_token, refresh_token } = signIn.data.session;
    cookies.set("sb-access-token", access_token, { path: "/" });
    cookies.set("sb-refresh-token", refresh_token, { path: "/" });
    return redirect("/");
  }

  const { access_token, refresh_token } = data.session;
  cookies.set("sb-access-token", access_token, { path: "/" });
  cookies.set("sb-refresh-token", refresh_token, { path: "/" });
  return redirect("/");
};