import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec, q, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try { const items = await q("SELECT id as _id, name, title, bio, avatar, active FROM mentors ORDER BY created_at DESC"); return ok({ items }); }
  catch (e) { return serverError(e.message); }
}

export async function POST(req) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try {
    const b = await req.json();
    const id = uid();
    await exec("INSERT INTO mentors (id,name,title,bio,avatar) VALUES (?,?,?,?,?)", [id, b.name, b.title || null, b.bio || null, b.avatar || null]);
    return ok({ item: { _id: id, ...b } });
  } catch (e) { return serverError(e.message); }
}
