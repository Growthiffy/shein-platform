import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, uid, qOne } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const { amount, chain, address } = await req.json();
    if (!amount || amount <= 0) return badReq("bad amount");
    if (Number(amount) > u.balance) return badReq("insufficient balance");
    const id = uid();
    await exec(
      "INSERT INTO transactions (id,user_id,type,amount,status,chain,address) VALUES (?,?,?,?,?,?,?)",
      [id, u.id, "withdrawal", Number(amount), "pending", chain || null, address || null]
    );
    const newBal = +(u.balance - Number(amount)).toFixed(2);
    await exec("UPDATE users SET balance=? WHERE id=?", [newBal, u.id]);
    const tx = await qOne("SELECT * FROM transactions WHERE id=?", [id]);
    return ok({ tx, balance: newBal });
  } catch (e) { return serverError(e.message); }
}
