import { userFromRequest, unauth, ok, serverError } from "@/lib/auth";
import { q } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const rows = await q(
      `SELECT s.*, p.brand AS p_brand, p.name AS p_name
       FROM analyst_submissions s LEFT JOIN products p ON p.id = s.product_id
       WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 200`,
      [u.id]
    );
    const items = rows.map(r => ({
      _id: r.id,
      product: { brand: r.p_brand, name: r.p_name },
      createdAt: new Date(r.created_at),
      profitAmount: r.profit_amount,
      profitPct: r.profit_pct,
      status: r.status,
    }));
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}
