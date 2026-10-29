import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

const MAP = { brand: "brand", name: "name", image: "image", originalPrice: "original_price", isLatest: "is_latest", active: "active" };

export async function PATCH(req, { params }) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    const b = await req.json();
    const sets = []; const args = [];
    for (const [k, col] of Object.entries(MAP)) {
      if (k in b) {
        let v = b[k];
        if (col === "is_latest" || col === "active") v = v ? 1 : 0;
        if (col === "original_price") v = Number(v);
        sets.push(`${col} = ?`); args.push(v);
      }
    }
    args.push(params.id);
    await exec(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, args);
    return ok({ ok: true });
  } catch (e) { return serverError(e.message); }
}

export async function DELETE(req, { params }) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    await exec("DELETE FROM products WHERE id=?", [params.id]);
    return ok({ ok: true });
  } catch (e) { return serverError(e.message); }
}
