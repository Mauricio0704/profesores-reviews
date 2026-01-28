import { supabaseServer } from "../../lib/supabase";

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    const university_id = params.get("university_id");
    if (!university_id) {
      return new Response(JSON.stringify({ error: "university_id is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const campus_id = params.get("campus_id");
    const course_id = params.get("course_id");
    const search = params.get("search");
    const sort = params.get("sort") || "best";
    const limit = Math.max(1, parseInt(params.get("limit") || "20", 10));
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));

    const offset = (page - 1) * limit;
    const rangeStart = offset;
    const rangeEnd = offset + limit - 1;

    // Base query: select basic professor fields and rely on DB columns for aggregates
    let qb = supabaseServer
      .from("professors")
      .select("id,name")
      .range(rangeStart, rangeEnd);

    // Apply optional filters where possible
    if (search) {
      qb = qb.ilike("name", `%${search}%`);
    }

    if (campus_id) qb = qb.eq("campus_id", campus_id);
    if (course_id) qb = qb.eq("course_id", course_id);

    const { data, error } = await qb;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const professors = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      reviews_count: p.reviews_count ?? 0,
    }));

    return new Response(JSON.stringify(professors), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
