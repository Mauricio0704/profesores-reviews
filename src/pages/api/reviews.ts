import type { APIRoute } from "astro";
import { supabaseServer, supabaseClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const professor_id = formData.get("professor_id")?.toString();
  const course_id = formData.get("course_id")?.toString() || null;
  const comment = formData.get("comment")?.toString() || null;
  const difficulty = Number(formData.get("difficulty"));
  const quality = Number(formData.get("quality"));
  const would_recommend_raw = formData.get("would_recommend");
  const would_recommend = would_recommend_raw === "on" || would_recommend_raw === "true";

  if (!professor_id) {
    return new Response("professor_id is required", { status: 400 });
  }

  if (!Number.isFinite(difficulty) || !Number.isFinite(quality)) {
    return new Response("difficulty and quality must be numeric", { status: 400 });
  }

  // Validate and establish session from cookies (ensure user is signed in)
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return redirect("/signin");
  }

  const session = await supabaseClient.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });

  if (session.error) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    return redirect("/signin");
  }

  // Insert review using server client (service role) to avoid relying on anon key
  const { error } = await supabaseServer.from("reviews").insert([
    {
      professor_id,
      course_id: course_id || null,
      comment,
      difficulty,
      quality,
      would_recommend,
    },
  ]);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  // Redirect back to professor page
  return redirect(`/professor/${professor_id}`);
};
