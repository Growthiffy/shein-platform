"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { COMMUNITY_GROUPS } from "@/lib/constants";
import { Trash2, Reply, X, Send } from "lucide-react";

export default function CommunityAdmin() {
  const [mentors, setMentors] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState("");
  const [mq, setMq] = useState("");
  const [group, setGroup] = useState("");
  const [authorName, setAuthorName] = useState("Shein Staff");
  const [text, setText] = useState("");
  const [canReply, setCanReply] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [note, setNote] = useState("");
  const box = useRef(null);
  const typingSentAt = useRef(0);

  useEffect(() => { api("/api/mentor").then(d => setMentors(d.items)).catch(() => {}); loadMembers(); }, []);
  async function loadMembers() {
    const d = await api(`/api/admin/users${mq.trim() ? "?q=" + encodeURIComponent(mq.trim()) : ""}`).catch(() => ({ items: [] }));
    setMembers(d.items || []);
    if (!memberId && d.items?.length) { setMemberId(d.items[0]._id); setGroup(`daily:${d.items[0]._id}`); }
  }
  async function loadMessages(g, scroll = true) {
    if (!g) return;
    const items = (await api(`/api/admin/chat/${g}`)).items.reverse();
    setMessages(items);
    if (scroll) setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => { setReplyTo(null); loadMessages(group).catch(() => {}); const t = setInterval(() => loadMessages(group, false), 8000); return () => clearInterval(t); }, [group]);

  // Presence heartbeat while viewing a group → mutes the AI personas / mentor
  // auto-reply in that room so a real operator is never talked over.
  useEffect(() => {
    const beat = (typing) => api("/api/mentor-admin/presence", { method: "POST", body: { group, typing } }).catch(() => {});
    beat(false);
    const t = setInterval(() => beat(false), 20000);
    return () => { clearInterval(t); api("/api/mentor-admin/presence/clear", { method: "POST", body: { group } }).catch(() => {}); };
  }, [group]);
  function onType(v) {
    setText(v);
    const now = Date.now();
    if (now - typingSentAt.current > 3000) { typingSentAt.current = now; api("/api/mentor-admin/presence", { method: "POST", body: { group, typing: true } }).catch(() => {}); }
  }

  // Default the author name to the mentor's name when a mentor room is selected.
  useEffect(() => {
    if (group.startsWith("mentor:")) {
      const m = mentors.find(x => `mentor:${x._id}` === group);
      if (m) setAuthorName(m.name);
    } else setAuthorName("Shein Staff");
  }, [group, mentors]);

  // Each member has their own daily/invest rooms. Mentor rooms are shared per mentor.
  const groups = [
    ...(memberId ? [{ v: `daily:${memberId}`, t: "Daily Analysts" }, { v: `invest:${memberId}`, t: "Investors" }] : []),
    ...mentors.map(m => ({ v: `mentor:${m._id}`, t: `mentor · ${m.name}` })),
  ];
  const mName = m => m.username || (m.email || "").split("@")[0];

  async function post() {
    setNote("");
    const t = text.replace(/\r\n/g, "\n");
    if (!t.trim()) return;
    try {
      await api(`/api/admin/chat/${group}`, { method: "POST", body: { text: t, authorName, canReply, replyTo: replyTo?._id } });
      setText(""); setReplyTo(null); setNote("sent ✓"); loadMessages(group);
    } catch (e) { setNote(e.message); }
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }
  async function del(id) { if (!confirm("Delete this message?")) return; await api(`/api/admin/chat/message/${id}`, { method: "DELETE" }); loadMessages(group, false); }

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h1 className="text-2xl text-gold font-display">Community</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={mq} onChange={e => setMq(e.target.value)} onKeyDown={e => e.key === "Enter" && loadMembers()} placeholder="Find member…" className="w-40 text-sm" />
          <button className="btn text-sm" onClick={loadMembers}>Find</button>
          <select value={memberId} onChange={e => { setMemberId(e.target.value); setGroup(`daily:${e.target.value}`); }} className="text-sm">
            {!members.length && <option value="">No members</option>}
            {members.map(m => <option key={m._id} value={m._id}>{mName(m)} (#{m.accountNumber ?? "?"})</option>)}
          </select>
          <select value={group} onChange={e => setGroup(e.target.value)} className="text-sm">
            {groups.map(g => <option key={g.v} value={g.v}>{g.t}</option>)}
          </select>
        </div>
      </div>
      <p className="text-cream/50 text-xs mb-3">Each member has their own private community. Pick a member, then a room.</p>

      <div className="card flex flex-col" style={{ height: "74vh" }}>
        <div ref={box} className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {messages.map(m => (
            <div key={m._id} className="group flex gap-2.5">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gold2/15 grid place-items-center text-gold2 text-sm overflow-hidden">
                {m.authorAvatar ? <img src={m.authorAvatar} alt="" className="h-full w-full object-cover" /> : (m.authorName || "?")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-cream/70 font-medium">{m.authorName || "member"}</span>
                  <span className="chip">{m.authorType}</span>
                  <span className="text-cream/30">{new Date(m.createdAt).toLocaleString()}</span>
                  <span className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setReplyTo(m)} className="text-cream/40 hover:text-gold2" title="Reply"><Reply size={13} /></button>
                    <button onClick={() => del(m._id)} className="text-cream/40 hover:text-gold2" title="Delete"><Trash2 size={12} /></button>
                  </span>
                </div>
                {m.replyTo?.text && (
                  <div className="mt-1 border-l-2 border-gold2/60 bg-gold2/5 rounded-r px-2 py-1">
                    <div className="text-[11px] text-gold2 font-medium">{m.replyTo.authorName}</div>
                    <div className="text-[11px] text-cream/50 truncate">{m.replyTo.text}</div>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            </div>
          ))}
          {!messages.length && <div className="text-cream/50 text-sm">No messages in this group.</div>}
        </div>

        <div className="border-t border-line p-3 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 rounded-lg bg-ink2 px-3 py-2">
              <Reply size={14} className="text-gold2 shrink-0" />
              <div className="min-w-0 flex-1"><div className="text-[11px] text-gold2 font-medium">Replying to {replyTo.authorName}</div><div className="text-[11px] text-cream/50 truncate">{replyTo.text}</div></div>
              <button onClick={() => setReplyTo(null)} className="text-cream/40 hover:text-cream"><X size={15} /></button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input value={authorName} onChange={e => setAuthorName(e.target.value)} className="w-40 text-sm" placeholder="Post as…" />
            <label className="flex items-center gap-1 text-xs text-cream/60 whitespace-nowrap"><input type="checkbox" checked={canReply} onChange={e => setCanReply(e.target.checked)} className="w-auto" /> allow replies</label>
            {note && <span className="text-xs text-cream/50">{note}</span>}
          </div>
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={e => onType(e.target.value)} onKeyDown={onKey} rows={1} className="flex-1 resize-none max-h-32" placeholder="Join the chat / reply as staff…  (Enter to send)" />
            <button className="btn" onClick={post}><Send size={15} /></button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
