import { supabaseServer } from "../../lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("courses")
      .select(
        "id,name,code,semester",
      );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const courses = (data || []).map((c: any) => ({
      course_id: c.id,
      clave: c.code,
      nombre: c.name,
      semestre: c.semester,
    }));

    return new Response(JSON.stringify(courses), {
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
