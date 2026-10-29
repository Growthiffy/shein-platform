import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec, q, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try { const items = await q("SELECT id as _id, chain, address, label, active FROM deposit_wallets ORDER BY created_at DESC"); return ok({ items }); }
  catch (e) { return serverError(e.message); }
}

export async function POST(req) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try {
    const b = await req.json();
    const id = uid();
    await exec("INSERT INTO deposit_wallets (id,chain,address,label,active) VALUES (?,?,?,?,?)", [id, b.chain, b.address, b.label || null, 1]);
    return ok({ item: { _id: id, ...b, active: true } });
  } catch (e) { return serverError(e.message); }
}
