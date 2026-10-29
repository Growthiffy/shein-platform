"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { COMMUNITY_GROUPS } from "@/lib/constants";
import { Trash2 } from "lucide-react";

export default function CommunityAdmin() {
  const [mentors, setMentors] = useState([]);
  const [group, setGroup] = useState("daily");
  const [authorName, setAuthorName] = useState("");
  const [text, setText] = useState("");
  const [canReply, setCanReply] = useState(false);
  const [msg, setMsg] = useState("");

  const [modGroup, setModGroup] = useState("daily");
  const [messages, setMessages] = useState([]);

  useEffect(() => { api("/api/mentor").then(d => setMentors(d.items)); }, []);
  async function loadMessages(g) { setMessages((await api(`/api/admin/chat/${g}`)).items); }
  useEffect(() => { loadMessages(modGroup).catch(() => {}); }, [modGroup]);

  const groups = [
    ...COMMUNITY_GROUPS.map(g => ({ v: g, t: g })),
    ...mentors.map(m => ({ v: `mentor:${m._id}`, t: `mentor:${m.name}` })),
  ];

  async function post() {
    setMsg("");
    try { await api(`/api/admin/chat/${group}`, { method: "POST", body: { text, authorName, canReply } }); setText(""); setMsg("posted ✓"); if (group === modGroup) loadMessages(modGroup); }
    catch (e) { setMsg(e.message); }
  }
  async function del(id) {
    if (!confirm("Delete this message?")) return;
    await api(`/api/admin/chat/message/${id}`, { method: "DELETE" });
    loadMessages(modGroup);
  }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4 font-display">Community</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* announce */}
        <div className="card p-4 space-y-3 h-max">
          <h2 className="text-gold">Publish staff announcement</h2>
          <label className="text-sm block">Group
            <select className="w-full mt-1" value={group} onChange={e => setGroup(e.target.value)}>
              {groups.map(g => <option key={g.v} value={g.v}>{g.t}</option>)}
            </select>
          </label>
          <label className="text-sm block">Author name (shown with Staff badge)
            <input className="w-full mt-1" value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="e.g. Aria C." />
          </label>
          <label className="text-sm block">Message
            <textarea rows={3} className="w-full mt-1" value={text} onChange={e => setText(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canReply} onChange={e => setCanReply(e.target.checked)} /> allow replies
          </label>
          <button className="btn" onClick={post}>Post</button>
          {msg && <div className="text-cream/60 text-sm">{msg}</div>}
        </div>

        {/* moderation */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gold">Moderate messages</h2>
            <select value={modGroup} onChange={e => setModGroup(e.target.value)} className="text-sm">
              {groups.map(g => <option key={g.v} value={g.v}>{g.t}</option>)}
            </select>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-line">
            {messages.map(m => (
              <div key={m._id} className="py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-cream/50">{m.authorName || "member"} · {m.authorType} · {new Date(m.createdAt).toLocaleString()}</div>
                  <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                </div>
                <button onClick={() => del(m._id)} className="btn-ghost text-xs shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
            {!messages.length && <div className="text-cream/50 text-sm py-4">No messages in this group.</div>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
