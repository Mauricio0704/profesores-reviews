import type { APIRoute } from "astro";
import { supabaseServer, supabaseClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const professor_id = formData.get("professor_id")?.toString();
  const university_id = formData.get("university_id")?.toString();
  const course_id = formData.get("course_id")?.toString() || null;
  const new_course_name = formData.get("new_course_name")?.toString().trim();
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

  const userId = session.data.session?.user?.id;
  if (!userId) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    return redirect("/signin");
  }

  let resolvedCourseId = course_id || null;

  if (!resolvedCourseId && new_course_name) {
    if (!university_id) {
      return new Response("university_id is required to create a course", { status: 400 });
    }

    const { data: newCourse, error: courseError } = await supabaseServer
      .from("courses")
      .insert([
        {
          name: new_course_name,
          university_id,
        },
      ])
      .select("id")
      .single();

    if (courseError) {
      return new Response(courseError.message, { status: 500 });
    }

    resolvedCourseId = newCourse?.id ?? null;
  }

  // Insert review using server client (service role) to avoid relying on anon key
  const { error } = await supabaseServer.from("reviews").insert([
    {
      user_id: userId,
      professor_id,
      course_id: resolvedCourseId,
      comment,
      difficulty,
      quality,
      would_recommend,
    },
  ]);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  if (resolvedCourseId) {
    const { data: existingLink, error: linkCheckError } = await supabaseServer
      .from("professor_courses")
      .select("professor_id")
      .eq("professor_id", professor_id)
      .eq("course_id", resolvedCourseId)
      .maybeSingle();

    if (linkCheckError) {
      return new Response(linkCheckError.message, { status: 500 });
    }

    if (!existingLink) {
      const { error: linkInsertError } = await supabaseServer
        .from("professor_courses")
        .insert([
          {
            professor_id,
            course_id: resolvedCourseId,
          },
        ]);

      if (linkInsertError) {
        return new Response(linkInsertError.message, { status: 500 });
      }
    }
  }

  // Redirect back to professor page
  return redirect(`/professor/${professor_id}`);
};
