import { exec, qOne } from "@/lib/db";
import { ok, badReq, serverError } from "@/lib/auth";

export const runtime = "nodejs";

function makeCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function POST(req) {
  try {
    const { email } = await req.json();
    const u = await qOne("SELECT * FROM users WHERE email = ?", [email?.toLowerCase()]);
    if (!u) return badReq("no user");
    const code = makeCode();
    await exec("UPDATE users SET verify_code=?, verify_expires=? WHERE id=?", [code, Date.now() + 15 * 60 * 1000, u.id]);
    console.log(`[VERIFY ${email}] code=${code}`);
    return ok({ ok: true, devCode: process.env.NODE_ENV !== "production" ? code : undefined });
  } catch (e) { return serverError(e.message); }
}
