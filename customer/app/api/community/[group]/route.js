import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, q, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const rows = await q("SELECT * FROM chat_messages WHERE group_key = ? ORDER BY created_at DESC LIMIT 200", [params.group]);
    const items = rows.reverse().map(r => ({
      _id: r.id, group: r.group_key, authorType: r.author_type, authorName: r.author_name,
      authorAvatar: r.author_avatar, text: r.text, canReply: !!r.can_reply,
      createdAt: new Date(r.created_at),
    }));
    return ok({ items });
  } catch (e) { return serverError(e.message); }
}

export async function POST(req, { params }) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const { text } = await req.json();
    if (!text?.trim()) return badReq("empty");
    const id = uid();
    const name = u.username || u.email.split("@")[0];
    await exec("INSERT INTO chat_messages (id,group_key,user_id,author_type,author_name,text) VALUES (?,?,?,?,?,?)",
      [id, params.group, u.id, "user", name, text.trim()]);
    return ok({ msg: { _id: id, text: text.trim(), authorName: name } });
  } catch (e) { return serverError(e.message); }
}
