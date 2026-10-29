import bcrypt from "bcryptjs";
import { qOne } from "@/lib/db";
import { sign, ok, badReq, serverError } from "@/lib/auth";
import { publicUser } from "@/lib/business";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const u = await qOne("SELECT * FROM users WHERE email = ?", [email?.toLowerCase()]);
    if (!u) return badReq("bad credentials");
    const okPw = await bcrypt.compare(password || "", u.password_hash);
    if (!okPw) return badReq("bad credentials");
    if (!u.email_verified) return new Response(JSON.stringify({ error: "verify email first", needsVerification: true }), { status: 403, headers: { "Content-Type": "application/json" } });
    return ok({ token: sign(u), user: publicUser(u) });
  } catch (e) { return serverError(e.message); }
}
