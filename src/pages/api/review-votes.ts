import type { APIRoute } from "astro";
import { supabaseClient } from "~/lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  let review_id: string | null = null;
  let vote: string | null = null;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      review_id = body.review_id?.toString() ?? null;
      vote = body.vote?.toString() ?? null;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
  } else {
    const formData = await request.formData();
    review_id = formData.get("review_id")?.toString() ?? null;
    vote = formData.get("vote")?.toString() ?? null;
  }

  if (!review_id || (vote !== "up" && vote !== "down")) {
    return new Response("review_id and valid vote are required", { status: 400 });
  }

  const normalizedVote = vote === "up" ? 1 : -1;

  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = await supabaseClient.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });

  if (session.error) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.data.session?.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: existingVote, error: existingError } = await supabaseClient
    .from("review_votes")
    .select("id, vote")
    .eq("review_id", review_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    return new Response(existingError.message, { status: 500 });
  }

  let userVote: string | null = vote;

  if (existingVote) {
    if (Number(existingVote.vote) === normalizedVote) {
      const { error: deleteError } = await supabaseClient
        .from("review_votes")
        .delete()
        .eq("id", existingVote.id);

      if (deleteError) {
        return new Response(deleteError.message, { status: 500 });
      }

      userVote = null;
    } else {
      const { error: updateError } = await supabaseClient
        .from("review_votes")
        .update({ vote: normalizedVote })
        .eq("id", existingVote.id);

      if (updateError) {
        return new Response(updateError.message, { status: 500 });
      }
    }
  } else {
    const { error: insertError } = await supabaseClient
      .from("review_votes")
      .insert([
        {
          review_id,
          user_id: userId,
          vote: normalizedVote,
        },
      ]);

    if (insertError) {
      return new Response(insertError.message, { status: 500 });
    }
  }

  const { count: upvotes } = await supabaseClient
    .from("review_votes")
    .select("id", { count: "exact", head: true })
    .eq("review_id", review_id)
    .eq("vote", 1);

  const { count: downvotes } = await supabaseClient
    .from("review_votes")
    .select("id", { count: "exact", head: true })
    .eq("review_id", review_id)
    .eq("vote", -1);

  return new Response(
    JSON.stringify({
      upvotes: upvotes ?? 0,
      downvotes: downvotes ?? 0,
      userVote,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
