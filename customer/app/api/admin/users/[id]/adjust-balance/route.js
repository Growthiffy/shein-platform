import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec, qOne, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    const { amount, note } = await req.json();
    const u = await qOne("SELECT * FROM users WHERE id=?", [params.id]);
    if (!u) return ok({ error: "no user" });
    const newBal = +(u.balance + Number(amount || 0)).toFixed(2);
    await exec("UPDATE users SET balance=? WHERE id=?", [newBal, u.id]);
    await exec("INSERT INTO transactions (id,user_id,type,amount,note) VALUES (?,?,?,?,?)",
      [uid(), u.id, "adjustment", Number(amount || 0), note || "admin adjust"]);
    return ok({ ok: true, balance: newBal });
  } catch (e) { return serverError(e.message); }
}
