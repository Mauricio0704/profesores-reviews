import type { APIRoute } from "astro";
import { supabaseClient } from "~/lib/supabase";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const universityId = url.searchParams.get("university_id");

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const normalizedQuery = query ? normalizeText(query) : "";

  if (!normalizedQuery || normalizedQuery.length < 2 || !universityId) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  const { data, error } = await supabaseClient
    .from("courses")
    .select("id, name")
    .eq("university_id", universityId)
    .ilike("name", `%${normalizedQuery}%`)
    .limit(5);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const initialResults = Array.isArray(data) ? data : [];
  if (initialResults.length >= 5) {
    return new Response(JSON.stringify(initialResults), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: allCourses, error: allError } = await supabaseClient
    .from("courses")
    .select("id, name")
    .eq("university_id", universityId);

  if (allError) {
    return new Response(JSON.stringify({ error: allError.message }), { status: 500 });
  }

  const filtered = (Array.isArray(allCourses) ? allCourses : []).filter((course) => {
    const name = course.name ? normalizeText(String(course.name)) : "";
    return name.includes(normalizedQuery);
  });

  return new Response(JSON.stringify(filtered.slice(0, 5)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};