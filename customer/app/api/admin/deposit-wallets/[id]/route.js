import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req, { params }) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try {
    const b = await req.json();
    const sets = []; const args = [];
    if ("active" in b) { sets.push("active = ?"); args.push(b.active ? 1 : 0); }
    if ("chain" in b) { sets.push("chain = ?"); args.push(b.chain); }
    if ("address" in b) { sets.push("address = ?"); args.push(b.address); }
    if ("label" in b) { sets.push("label = ?"); args.push(b.label); }
    args.push(params.id);
    await exec(`UPDATE deposit_wallets SET ${sets.join(", ")} WHERE id = ?`, args);
    return ok({ ok: true });
  } catch (e) { return serverError(e.message); }
}

export async function DELETE(req, { params }) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try { await exec("DELETE FROM deposit_wallets WHERE id=?", [params.id]); return ok({ ok: true }); }
  catch (e) { return serverError(e.message); }
}
