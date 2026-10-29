import { q } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  const items = await q("SELECT id as _id, name, title, bio, avatar FROM mentors WHERE active = 1");
  return new Response(JSON.stringify({ items }), { headers: { "Content-Type": "application/json" } });
}
