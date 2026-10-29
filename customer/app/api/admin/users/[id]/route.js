import { requireAdmin } from "@/lib/admin";
import { ok, badReq, serverError } from "@/lib/auth";
import { exec, qOne } from "@/lib/db";

export const runtime = "nodejs";

const MAP = { balance: "balance", dailySalary: "daily_salary", level: "level", isAdmin: "is_admin", username: "username", emailVerified: "email_verified" };

export async function PATCH(req, { params }) {
  try {
    const a = await requireAdmin(req); if (a.res) return a.res;
    const body = await req.json();
    const sets = []; const args = [];
    for (const [k, col] of Object.entries(MAP)) {
      if (k in body) {
        let v = body[k];
        if (col === "is_admin" || col === "email_verified") v = v ? 1 : 0;
        sets.push(`${col} = ?`); args.push(v);
      }
    }
    if (!sets.length) return badReq("nothing to update");
    args.push(params.id);
    await exec(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, args);
    const user = await qOne("SELECT * FROM users WHERE id=?", [params.id]);
    return ok({ user });
  } catch (e) { return serverError(e.message); }
}
