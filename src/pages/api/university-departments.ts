import type { APIRoute } from "astro";
import { supabaseServer } from "../../lib/supabase";

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const universityId = url.searchParams.get("university_id");

    if (!universityId) {
      return new Response(JSON.stringify({ error: "university_id is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const { data, error } = await supabaseServer
      .from("professors")
      .select("department")
      .eq("university_id", universityId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const unique = new Set<string>();
    (data || []).forEach((row: { department?: string | null }) => {
      const value = String(row.department || "").trim();
      if (value) unique.add(value);
    });

    const departments = Array.from(unique).sort((a, b) => a.localeCompare(b));

    return new Response(JSON.stringify(departments), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
