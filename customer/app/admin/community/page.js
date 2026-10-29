"use client";
import { useState } from "react";
import Shell from "@/components/AdminShell";
import { adminApi as api } from "@/components/AdminShell";

export default function CommunityAdmin() {
  const [group, setGroup] = useState("daily");
  const [authorName, setAuthorName] = useState("");
  const [text, setText] = useState("");
  const [canReply, setCanReply] = useState(false);
  const [msg, setMsg] = useState("");

  async function post() {
    setMsg("");
    try { await api(`/api/admin/chat/${group}`, { method: "POST", body: { text, authorName, canReply } }); setText(""); setMsg("posted"); }
    catch (e) { setMsg(e.message); }
  }
  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Community · post as persona</h1>
      <div className="card p-4 max-w-2xl space-y-3">
        <label className="text-sm block">Group
          <input className="w-full mt-1" value={group} onChange={e => setGroup(e.target.value)} placeholder="daily | invest | mentor:<id>" />
        </label>
        <label className="text-sm block">Persona name
          <input className="w-full mt-1" value={authorName} onChange={e => setAuthorName(e.target.value)} />
        </label>
        <label className="text-sm block">Message
          <textarea rows={3} className="w-full mt-1" value={text} onChange={e => setText(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canReply} onChange={e => setCanReply(e.target.checked)} /> persona can reply
        </label>
        <button className="btn" onClick={post}>Post</button>
        {msg && <div className="text-cream/60 text-sm">{msg}</div>}
      </div>
    </Shell>
  );
}
