import { requireAdmin } from "@/lib/admin";
import { ok, badReq, serverError } from "@/lib/auth";
import { exec, qOne } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try {
    const tx = await qOne("SELECT * FROM transactions WHERE id=?", [params.id]);
    if (!tx) return badReq("no tx");
    if (tx.status !== "pending") return badReq("already resolved");
    await exec("UPDATE transactions SET status='rejected' WHERE id=?", [tx.id]);
    if (tx.type === "withdrawal") {
      const u = await qOne("SELECT balance FROM users WHERE id=?", [tx.user_id]);
      await exec("UPDATE users SET balance=? WHERE id=?", [+(u.balance + tx.amount).toFixed(2), tx.user_id]);
    }
    return ok({ ok: true });
  } catch (e) { return serverError(e.message); }
}
