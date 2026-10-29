import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, qOne } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    if (u.mentor_id) return badReq("mentor already set; contact support to change");
    const { id } = await req.json();
    const m = await qOne("SELECT * FROM mentors WHERE id=?", [id]);
    if (!m) return badReq("no mentor");
    await exec("UPDATE users SET mentor_id=? WHERE id=?", [m.id, u.id]);
    return ok({ mentor: { _id: m.id, name: m.name, title: m.title, bio: m.bio } });
  } catch (e) { return serverError(e.message); }
}
