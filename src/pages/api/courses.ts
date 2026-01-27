import { supabase } from "../../lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(
        "course_id,clave,nombre,semestre,profesor_courses(profesores(profesor_id,nombre,departamento,email))",
      );

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const courses = (data || []).map((c: any) => ({
      course_id: c.course_id,
      clave: c.clave,
      nombre: c.nombre,
      semestre: c.semestre,
      professors: (c.profesor_courses || [])
        .map((pc: any) => pc.profesores)
        .filter(Boolean),
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
