"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Trash2, Reply, X, Send, Search } from "lucide-react";

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
  const didInit = useRef(false);

  useEffect(() => { api("/api/mentor").then(d => setMentors(d.items)).catch(() => {}); loadMembers(true); }, []);

  async function loadMembers(initial = false) {
    const d = await api(`/api/admin/users${mq.trim() ? "?q=" + encodeURIComponent(mq.trim()) : ""}`).catch(() => ({ items: [] }));
    setMembers(d.items || []);
    if (initial && !didInit.current) {
      didInit.current = true;
      // Deep-link support: /community?member=<id>&group=daily:<id>|mentor:<id>:<id>
      const p = new URLSearchParams(window.location.search);
      const qGroup = p.get("group"); const qMember = p.get("member");
      if (qMember) setMemberId(qMember);
      if (qGroup) { setGroup(qGroup); return; }
      if (qMember) { setGroup(`daily:${qMember}`); return; }
    }
    if (!memberId && d.items?.length) { setMemberId(d.items[0]._id); setGroup(g => g || `daily:${d.items[0]._id}`); }
  }

  async function loadMessages(g, scroll = true) {
    if (!g) return;
    const items = (await api(`/api/admin/chat/${g}`)).items.reverse();
    setMessages(items);
    if (scroll) setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => { setReplyTo(null); loadMessages(group).catch(() => {}); const t = setInterval(() => loadMessages(group, false), 8000); return () => clearInterval(t); }, [group]);

  // Presence heartbeat while viewing a group → mutes personas / mentor auto-reply.
  useEffect(() => {
    if (!group) return;
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
      const id = group.split(":")[1];
      const m = mentors.find(x => String(x._id) === id);
      if (m) setAuthorName(m.name);
    } else setAuthorName("Shein Staff");
  }, [group, mentors]);

  const mName = m => m.username || (m.email || "").split("@")[0];
  const selMember = members.find(m => String(m._id) === String(memberId));
  const base = group.startsWith("invest") ? "invest" : group.startsWith("mentor:") ? "mentor" : "daily";

  function pickMember(id) { setMemberId(id); setGroup(`daily:${id}`); }

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

  const roomTabClass = (on) => `px-3 py-1.5 rounded-lg text-sm font-medium transition ${on ? "bg-gold text-ink" : "bg-black/[0.04] text-cream/70 hover:bg-black/[0.06]"}`;

  return (
    <Shell>
      <h1 className="text-2xl text-gold font-display mb-1">Community</h1>
      <p className="text-cream/50 text-xs mb-3">Each member has a private community. Pick a member on the left, then a room.</p>

      <div className="grid gap-3" style={{ gridTemplateColumns: "260px 1fr", height: "76vh" }}>
        {/* Switcher sidebar */}
        <div className="card flex flex-col overflow-hidden">
          <div className="p-2 border-b border-line flex items-center gap-1.5">
            <Search size={14} className="text-cream/40 shrink-0" />
            <input value={mq} onChange={e => setMq(e.target.value)} onKeyDown={e => e.key === "Enter" && loadMembers()} placeholder="Find member…" className="flex-1 text-sm !py-1" />
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {members.map(m => (
              <button key={m._id} onClick={() => pickMember(m._id)}
                className={`w-full text-left rounded-lg px-2.5 py-2 transition ${String(memberId) === String(m._id) ? "bg-gold/15" : "hover:bg-black/[0.04]"}`}>
                <div className="text-cream text-sm font-medium truncate">{mName(m)}</div>
                <div className="text-[11px] text-cream/40">{m.accountNumber ? `#${m.accountNumber}` : "unverified"}</div>
              </button>
            ))}
            {!members.length && <div className="text-cream/50 text-sm p-2">No members.</div>}
          </div>
        </div>

        {/* Chat column */}
        <div className="card flex flex-col overflow-hidden min-w-0">
          {/* Room tabs — switch instantly */}
          <div className="flex flex-wrap items-center gap-1.5 p-2.5 border-b border-line">
            {selMember && <span className="text-sm text-cream/70 mr-1">{mName(selMember)}:</span>}
            <button className={roomTabClass(base === "daily")} onClick={() => memberId && setGroup(`daily:${memberId}`)} disabled={!memberId}>Daily Analysts</button>
            <button className={roomTabClass(base === "invest")} onClick={() => memberId && setGroup(`invest:${memberId}`)} disabled={!memberId}>Investors</button>
            {mentors.length > 0 && <span className="mx-1 h-4 w-px bg-line" />}
            {mentors.map(m => (
              <button key={m._id} className={roomTabClass(group === `mentor:${m._id}`)} onClick={() => setGroup(`mentor:${m._id}`)}>{m.name}</button>
            ))}
          </div>

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
                  {m.image && (m.image.startsWith("data:application/pdf")
                    ? <a href={m.image} download={m.fileName || "file.pdf"} className="inline-flex items-center gap-1 underline text-xs text-gold2">📄 {m.fileName || "document.pdf"}</a>
                    : <img src={m.image} alt={m.fileName || ""} className="mt-1 max-h-48 rounded-lg" />)}
                  {m.text && <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>}
                </div>
              </div>
            ))}
            {!messages.length && <div className="text-cream/50 text-sm">No messages in this room.</div>}
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
              <textarea value={text} onChange={e => onType(e.target.value)} onKeyDown={onKey} rows={1} className="flex-1 min-w-0 resize-none max-h-32" placeholder="Join the chat / reply as staff…  (Enter to send)" />
              <button className="btn" onClick={post}><Send size={15} /></button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
