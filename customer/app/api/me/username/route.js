import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, qOne } from "@/lib/db";
import { publicUser } from "@/lib/business";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req);
    if (!u) return unauth();
    const { username } = await req.json();
    if (!username || username.length < 3) return badReq("min 3 chars");
    const taken = await qOne("SELECT id FROM users WHERE username = ? AND id != ?", [username, u.id]);
    if (taken) return badReq("username taken");
    await exec("UPDATE users SET username=? WHERE id=?", [username, u.id]);
    const fresh = await qOne("SELECT * FROM users WHERE id=?", [u.id]);
    return ok({ user: publicUser(fresh) });
  } catch (e) { return serverError(e.message); }
}
