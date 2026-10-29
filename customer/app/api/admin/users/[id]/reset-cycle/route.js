import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    await exec("UPDATE users SET analyst_cycle_count=0, analyst_pending_product_id=NULL, analyst_forced_pct=NULL WHERE id=?", [params.id]);
    return ok({ ok: true });
  } catch (e) { return serverError(e.message); }
}
