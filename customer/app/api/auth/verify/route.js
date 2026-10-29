import { exec, qOne } from "@/lib/db";
import { sign, ok, badReq, serverError } from "@/lib/auth";
import { publicUser } from "@/lib/business";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, code } = await req.json();
    const u = await qOne("SELECT * FROM users WHERE email = ?", [email?.toLowerCase()]);
    if (!u) return badReq("no user");
    if (u.verify_expires && u.verify_expires < Date.now()) return badReq("code expired");
    if (u.verify_code !== code) return badReq("bad code");
    const newBal = (!u.balance && u.reward_credit) ? u.reward_credit : u.balance;
    await exec(
      "UPDATE users SET email_verified=1, verify_code=NULL, verify_expires=NULL, balance=?, reward_credit=0 WHERE id=?",
      [newBal, u.id]
    );
    const fresh = await qOne("SELECT * FROM users WHERE id = ?", [u.id]);
    return ok({ token: sign(fresh), user: publicUser(fresh) });
  } catch (e) { return serverError(e.message); }
}
