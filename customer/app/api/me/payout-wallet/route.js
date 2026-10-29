import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, q, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const { chain, address, label } = await req.json();
    if (!chain || !address) return badReq("chain + address required");
    await exec("INSERT INTO payout_wallets (id,user_id,chain,address,label) VALUES (?,?,?,?,?)",
      [uid(), u.id, chain, address, label || null]);
    const items = await q("SELECT id,chain,address,label FROM payout_wallets WHERE user_id = ?", [u.id]);
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}

export async function GET(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const items = await q("SELECT id,chain,address,label FROM payout_wallets WHERE user_id = ?", [u.id]);
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}
