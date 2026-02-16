import { supabaseClient } from "~/lib/supabase";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    // Validación básica
    const university_id = params.get("university_id");
    if (!university_id) {
      return new Response(JSON.stringify({ error: "Se requiere university_id" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const campus_id = params.get("campus_id");
    const course_id = params.get("course_id");
    const search = params.get("search");
    
    // Paginación
    const limit = Math.max(1, parseInt(params.get("limit") || "20", 10));
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const rangeStart = (page - 1) * limit;
    const rangeEnd = rangeStart + limit - 1;

    let professorIdsFromCourseSearch: number[] = [];

    if (search) {
      const { data: matchingCourses } = await supabaseClient
        .from("courses")
        .select("id")
        .eq("university_id", university_id)
        .ilike("name", `%${search}%`);

      if (matchingCourses && matchingCourses.length > 0) {
        const courseIds = matchingCourses.map((c) => c.id);

        const { data: profsInCourses } = await supabaseClient
          .from("professor_courses")
          .select("professor_id")
          .in("course_id", courseIds);

        if (profsInCourses) {
          professorIdsFromCourseSearch = profsInCourses.map((p) => p.professor_id);
        }
      }
    }

    let query = supabaseClient
      .from("professors")
      .select("id, name, department, reviews_count")
      .eq("university_id", university_id);
    
    if (campus_id) query = query.eq("campus_id", campus_id);

    if (search) {
      if (professorIdsFromCourseSearch.length > 0) {
        query = query.or(`name.ilike.%${search}%,id.in.(${professorIdsFromCourseSearch.join(',')})`);
      } else {
        query = query.ilike("name", `%${search}%`);
      }
    }

    if (course_id) {
      const { data: profsWithCourse } = await supabaseClient
        .from("professor_courses")
        .select("professor_id")
        .eq("course_id", course_id);
      
      const ids = profsWithCourse?.map(p => p.professor_id) || [];
      
      if (ids.length > 0) {
        query = query.in("id", ids);
      } else {
        query = query.eq("id", 0);
      }
    }

    query = query
      .order("reviews_count", { ascending: false })
      .order("name", { ascending: true })
      .range(rangeStart, rangeEnd);

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const professors = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      department: p.department || "N/A",
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
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, department, university_id, course_name } = body;

    if (!name || !department || !university_id) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400 }
      );
    }

    const { data: newProfessor, error: profError } = await supabaseClient
      .from("professors")
      .insert([
        {
          name,
          department,
          university_id
        },
      ])
      .select()
      .single();

    if (profError) {
      return new Response(JSON.stringify({ error: profError.message }), { status: 500 });
    }

    if (course_name) {
      let courseIdToLink = null;

      const { data: existingCourse } = await supabaseClient
        .from("courses")
        .select("id")
        .eq("name", course_name)
        .eq("university_id", university_id)
        .maybeSingle();

      if (existingCourse) {
        courseIdToLink = existingCourse.id;
      } else {
        const { data: createdCourse, error: createCourseError } = await supabaseClient
          .from("courses")
          .insert([
            {
              name: course_name,
              university_id: university_id
            }
          ])
          .select("id")
          .single();

        if (createCourseError) {
           console.error("Error creando el curso nuevo:", createCourseError);
        } else {
           courseIdToLink = createdCourse.id;
        }
      }

      if (courseIdToLink) {
        const { error: linkError } = await supabaseClient
          .from("professor_courses")
          .insert([
            {
              professor_id: newProfessor.id,
              course_id: courseIdToLink,
            },
          ]);
          
        if (linkError) console.error("Error linkeando curso:", linkError);
      }
    }

    return new Response(JSON.stringify({ message: "Profesor sugerido", data: newProfessor }), {
      status: 201,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
    });
  }
};