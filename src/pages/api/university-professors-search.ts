import type { APIRoute } from "astro";
import { supabaseServer } from "~/lib/supabase";

const MAX_RESULTS = 5000;
const DEFAULT_PAGE_SIZE = 12;

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get("slug");
  const search = url.searchParams.get("search")?.trim() || "";
  const limit = Math.max(1, Math.min(MAX_RESULTS, Number(url.searchParams.get("limit") || DEFAULT_PAGE_SIZE)));
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const rangeStart = (page - 1) * limit;
  const rangeEnd = rangeStart + limit - 1;

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let query = supabaseServer
    .from("university_professor_stats")
    .select(
      "id, name, department, avg_rating, avg_difficulty, retake_rate, review_count, matching_courses",
      { count: "exact" }
    )
    .eq("university_slug", slug)
    .order("review_count", { ascending: false })
    .order("name", { ascending: true })
    .range(rangeStart, rangeEnd);

  if (search) {
    const like = `%${search}%`;
    query = query.or(`name.ilike.${like},department.ilike.${like},matching_courses.ilike.${like}`);
  }

  const { data, error, count } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return new Response(
    JSON.stringify({
      data: data ?? [],
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages,
      },
    }),
    {
    status: 200,
    headers: { "content-type": "application/json" },
    }
  );
};