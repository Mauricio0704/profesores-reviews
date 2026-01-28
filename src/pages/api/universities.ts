import { supabaseServer } from "../../lib/supabase";

export async function GET() {
    try{
        const { data, error } = await supabaseServer
        .from("universities")
        .select(`
            id,
            name,
            slug,
            courses (
            id,
            reviews (
                rating
            ),
            professor_course_campus (
                professors (
                id,
                department
                )
            )
            )
        `)
        .order('name', { ascending: true });
        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
            });
        }
        const universitiesStats = (data || []).map((u: any) => {
            const courses = u.courses || [];
            const all_reviews = courses.flatMap((c: any) => c.reviews || []);
            const review_count = all_reviews.length;

            const total_rating = all_reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
            const avg_rating = review_count > 0 ? total_rating / review_count : 0;

            const all_professors = courses.flatMap((c: any) => 
                (c.professor_course_campus || []).map((pcc: any) => pcc.professors)
            );
            const unique_professors = new Set(all_professors.map((p: any) => p.id));
            const unique_departments = new Set(
                all_professors
                    .map((p: any) => p.department)
                    .filter(Boolean)
                    .map((d: string) => d.trim().toLowerCase())
            );
            return {
                id: u.id,
                name: u.name,
                slug: u.slug,
                avg_rating,
                review_count,
                professor_count: unique_professors.size,
                department_count: unique_departments.size,
            };
        });
        
        return new Response(JSON.stringify(universitiesStats), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    }
    catch(err: any){
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "content-type": "application/json" },
        });
    }
}