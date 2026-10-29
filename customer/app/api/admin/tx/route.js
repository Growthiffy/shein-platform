import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { q } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try {
    const rows = await q(`SELECT t.*, u.email AS u_email FROM transactions t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 500`);
    const items = rows.map(t => ({ _id: t.id, user: { email: t.u_email }, type: t.type, amount: t.amount, chain: t.chain, status: t.status, createdAt: new Date(t.created_at) }));
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}
