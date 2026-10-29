import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    if (!u.investment_amount) return badReq("no active investment");
    if (u.investment_lock_until && u.investment_lock_until > Date.now()) return badReq("still locked");
    const amt = u.investment_amount;
    const newBal = +(u.balance + amt).toFixed(2);
    await exec("UPDATE users SET balance=?, investment_tier=0, investment_amount=0, investment_started_at=NULL, investment_lock_until=NULL, investment_last_payout_at=NULL WHERE id=?", [newBal, u.id]);
    await exec("INSERT INTO transactions (id,user_id,type,amount) VALUES (?,?,?,?)", [uid(), u.id, "invest_release", amt]);
    return ok({ balance: newBal });
  } catch (e) { return serverError(e.message); }
}
