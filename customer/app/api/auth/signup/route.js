import bcrypt from "bcryptjs";
import { exec, qOne, uid } from "@/lib/db";
import { SIGNUP_REWARD } from "@/lib/business";
import { ok, badReq, serverError } from "@/lib/auth";

export const runtime = "nodejs";

function makeCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return badReq("email + password required");
    const existing = await qOne("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing && existing.email_verified) return badReq("email in use");

    const hash = await bcrypt.hash(password, 10);
    const code = makeCode();
    const expires = Date.now() + 15 * 60 * 1000;

    if (existing) {
      await exec("UPDATE users SET password_hash=?, verify_code=?, verify_expires=?, reward_credit=? WHERE id=?",
        [hash, code, expires, SIGNUP_REWARD, existing.id]);
    } else {
      await exec("INSERT INTO users (id,email,password_hash,verify_code,verify_expires,reward_credit) VALUES (?,?,?,?,?,?)",
        [uid(), email.toLowerCase(), hash, code, expires, SIGNUP_REWARD]);
    }

    // Dev: log code so admin can share it. In prod, wire SMTP via a provider.
    console.log(`[VERIFY ${email}] code=${code}`);
    return ok({ ok: true, needsVerification: true, devCode: process.env.NODE_ENV !== "production" ? code : undefined });
  } catch (e) { return serverError(e.message); }
}
