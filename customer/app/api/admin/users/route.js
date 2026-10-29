import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { q } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    const rows = await q("SELECT * FROM users ORDER BY created_at DESC LIMIT 500");
    const items = rows.map(u => ({ _id: u.id, email: u.email, username: u.username, balance: u.balance, level: u.level, dailySalary: u.daily_salary, emailVerified: !!u.email_verified, isAdmin: !!u.is_admin, cycleCount: u.analyst_cycle_count }));
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}
