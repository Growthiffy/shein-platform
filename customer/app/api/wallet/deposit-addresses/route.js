import { userFromRequest, unauth, ok, serverError } from "@/lib/auth";
import { q } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const items = await q("SELECT id,chain,address,label FROM deposit_wallets WHERE active = 1");
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}
