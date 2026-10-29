import { userFromRequest, unauth, ok, serverError } from "@/lib/auth";
import { exec, q } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    await exec("DELETE FROM payout_wallets WHERE id=? AND user_id=?", [params.id, u.id]);
    const items = await q("SELECT id,chain,address,label FROM payout_wallets WHERE user_id = ?", [u.id]);
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}
