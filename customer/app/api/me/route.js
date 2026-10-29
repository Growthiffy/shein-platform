import { userFromRequest, unauth, ok, serverError } from "@/lib/auth";
import { exec, qOne, uid } from "@/lib/db";
import { pendingAccrual, publicUser, levelFor } from "@/lib/business";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const u = await userFromRequest(req);
    if (!u) return unauth();
    const acc = pendingAccrual(u);
    let changed = false;
    if (acc.weeks > 0 && acc.payout > 0) {
      await exec("UPDATE users SET balance=balance+?, total_earned=total_earned+?, investment_last_payout_at=? WHERE id=?",
        [acc.payout, acc.payout, acc.lastPayoutAt, u.id]);
      await exec("INSERT INTO transactions (id,user_id,type,amount,note) VALUES (?,?,?,?,?)",
        [uid(), u.id, "invest_payout", acc.payout, `${acc.weeks} wk × ${acc.tier?.weeklyPct}% @ Tier ${acc.tier?.name}`]);
      changed = true;
    }
    const fresh = changed ? await qOne("SELECT * FROM users WHERE id=?", [u.id]) : u;
    const lvl = levelFor(fresh.balance);
    if (fresh.level !== lvl.key) {
      await exec("UPDATE users SET level=?, daily_salary=? WHERE id=?", [lvl.key, lvl.dailySalary, u.id]);
      fresh.level = lvl.key; fresh.daily_salary = lvl.dailySalary;
    }
    return ok({ user: publicUser(fresh) });
  } catch (e) { return serverError(e.message); }
}
