import type { APIRoute } from "astro";
import { supabaseServer } from "~/lib/supabase";

const MAX_RESULTS = 5000;

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get("slug");
  const search = url.searchParams.get("search")?.trim() || "";

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let query = supabaseServer
    .from("university_professor_stats")
    .select(
      "id, name, department, avg_rating, avg_difficulty, retake_rate, review_count, matching_courses"
    )
    .eq("university_slug", slug)
    .order("review_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(MAX_RESULTS);

  if (search) {
    const like = `%${search}%`;
    query = query.or(`name.ilike.${like},department.ilike.${like},matching_courses.ilike.${like}`);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data: data ?? [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};