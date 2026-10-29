import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try { await exec("DELETE FROM mentors WHERE id=?", [params.id]); return ok({ ok: true }); }
  catch (e) { return serverError(e.message); }
}
