import { userFromRequest, unauth, ok, serverError } from "@/lib/auth";
import { q } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const items = await q("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 200", [u.id]);
    return ok({ items: items.map(t => ({ _id: t.id, type: t.type, amount: t.amount, status: t.status, chain: t.chain, address: t.address, note: t.note, createdAt: new Date(t.created_at) })) });
  } catch (e) { return serverError(e.message); }
}
