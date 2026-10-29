import { requireAdmin } from "@/lib/admin";
import { ok, badReq, serverError } from "@/lib/auth";
import { exec, qOne } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    const { profitPct, productId } = await req.json();
    const u = await qOne("SELECT id FROM users WHERE id=?", [params.id]);
    if (!u) return badReq("no user");
    if (productId) await exec("UPDATE users SET analyst_pending_product_id=?, analyst_forced_pct=? WHERE id=?", [productId, profitPct ?? null, params.id]);
    else await exec("UPDATE users SET analyst_forced_pct=? WHERE id=?", [profitPct ?? null, params.id]);
    return ok({ ok: true });
  } catch (e) { return serverError(e.message); }
}
