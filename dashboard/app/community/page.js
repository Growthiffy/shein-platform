"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { COMMUNITY_GROUPS } from "@/lib/constants";

export default function CommunityAdmin() {
  const [mentors, setMentors] = useState([]);
  const [group, setGroup] = useState("daily");
  const [authorName, setAuthorName] = useState("");
  const [text, setText] = useState("");
  const [canReply, setCanReply] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { api("/api/mentor").then(d => setMentors(d.items)); }, []);

  async function post() {
    setMsg("");
    try { await api(`/api/admin/chat/${group}`, { method: "POST", body: { text, authorName, canReply } }); setText(""); setMsg("posted ✓"); }
    catch (e) { setMsg(e.message); }
  }

  const groups = [
    ...COMMUNITY_GROUPS.map(g => ({ v: g, t: g })),
    ...mentors.map(m => ({ v: `mentor:${m._id}`, t: `mentor:${m.name}` })),
  ];

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Community · post as persona</h1>
      <div className="card p-4 max-w-2xl space-y-3">
        <label className="text-sm block">Group
          <select className="w-full mt-1" value={group} onChange={e => setGroup(e.target.value)}>
            {groups.map(g => <option key={g.v} value={g.v}>{g.t}</option>)}
          </select>
        </label>
        <label className="text-sm block">Persona name
          <input className="w-full mt-1" value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="e.g. Aria C." />
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
