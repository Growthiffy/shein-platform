import { requireAdmin } from "@/lib/admin";
import { ok, serverError } from "@/lib/auth";
import { exec, uid } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const a = await requireAdmin(req); if (a.res) return a.res;
  try {
    const { text, authorName, authorAvatar, canReply = false } = await req.json();
    const id = uid();
    await exec("INSERT INTO chat_messages (id,group_key,author_type,author_name,author_avatar,text,can_reply) VALUES (?,?,?,?,?,?,?)",
      [id, params.group, "ai", authorName || null, authorAvatar || null, text, canReply ? 1 : 0]);
    return ok({ msg: { _id: id, text, authorName } });
  } catch (e) { return serverError(e.message); }
}
