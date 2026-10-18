import { createPublicClient } from "@/lib/supabase/server";

// Current offers and approved reviews for the public website (web/public/site). No login.
export async function GET() {
  const { data, error } = await createPublicClient().rpc("website_content");
  if (error) {
    console.error("website_content failed", error.message);
    return Response.json({ offers: [], reviews: [] }, { status: 503 });
  }
  return Response.json(data ?? { offers: [], reviews: [] }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" },
  });
}
