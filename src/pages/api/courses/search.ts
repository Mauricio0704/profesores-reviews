import type { APIRoute } from "astro";
import { supabaseServer } from "../../../lib/supabase";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const universityId = url.searchParams.get("university_id");

  if (!query || query.length < 2 || !universityId) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  const { data, error } = await supabaseServer
    .from("courses")
    .select("id, code, name")
    .eq("university_id", universityId)
    .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(5);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};