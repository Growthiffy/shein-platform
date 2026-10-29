import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, uid } from "@/lib/db";
import { INVEST_TIERS } from "@/lib/business";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const { amount, tierLevel, lockWeeks = 4 } = await req.json();
    const tier = INVEST_TIERS.find(t => t.level === Number(tierLevel));
    if (!tier) return badReq("bad tier");
    if (Number(amount) < tier.min) return badReq(`min ${tier.min}`);
    if (Number(amount) > u.balance) return badReq("insufficient balance");
    const now = Date.now();
    const lockUntil = now + Number(lockWeeks) * 7 * 24 * 3600 * 1000;
    const newBal = +(u.balance - Number(amount)).toFixed(2);
    await exec(
      "UPDATE users SET balance=?, investment_tier=?, investment_amount=?, investment_started_at=?, investment_lock_until=?, investment_last_payout_at=? WHERE id=?",
      [newBal, tier.level, Number(amount), now, lockUntil, now, u.id]
    );
    await exec("INSERT INTO transactions (id,user_id,type,amount,note) VALUES (?,?,?,?,?)",
      [uid(), u.id, "invest_lock", Number(amount), `Tier ${tier.name}`]);
    return ok({ investment: { tier: tier.level, amount: Number(amount), startedAt: now, lockUntil }, balance: newBal });
  } catch (e) { return serverError(e.message); }
}
