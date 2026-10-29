import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, uid, qOne } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const { amount, chain, address, txHash, slipUrl } = await req.json();
    if (!amount || amount <= 0) return badReq("bad amount");
    const id = uid();
    await exec(
      "INSERT INTO transactions (id,user_id,type,amount,status,chain,address,tx_hash,slip_url) VALUES (?,?,?,?,?,?,?,?,?)",
      [id, u.id, "deposit", Number(amount), "pending", chain || null, address || null, txHash || null, slipUrl || null]
    );
    const tx = await qOne("SELECT * FROM transactions WHERE id=?", [id]);
    return ok({ tx });
  } catch (e) { return serverError(e.message); }
}
