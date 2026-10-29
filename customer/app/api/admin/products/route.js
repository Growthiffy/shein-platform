import { requireAdmin } from "@/lib/admin";
import { ok, badReq, serverError } from "@/lib/auth";
import { exec, q, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    const items = await q("SELECT * FROM products ORDER BY created_at DESC");
    return ok({ items: items.map(p => ({ _id: p.id, brand: p.brand, name: p.name, image: p.image, originalPrice: p.original_price, isLatest: !!p.is_latest, active: !!p.active })) });
  } catch (e) { return serverError(e.message); }
}

export async function POST(req) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    const b = await req.json();
    if (!b.brand || !b.name || !b.originalPrice) return badReq("brand, name, originalPrice required");
    const id = uid();
    await exec("INSERT INTO products (id,brand,name,image,original_price,is_latest,active) VALUES (?,?,?,?,?,?,?)",
      [id, b.brand, b.name, b.image || null, Number(b.originalPrice), b.isLatest ? 1 : 0, 1]);
    return ok({ item: { _id: id, ...b } });
  } catch (e) { return serverError(e.message); }
}
