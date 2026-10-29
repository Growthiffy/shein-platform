import { INVEST_TIERS } from "@/lib/business";
export const runtime = "nodejs";
export async function GET() { return new Response(JSON.stringify({ tiers: INVEST_TIERS }), { headers: { "Content-Type": "application/json" } }); }
