"use client";
import { useEffect, useRef, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Send, Trash2 } from "lucide-react";

const GROUPS = [{ id: "daily", label: "Daily Analysts" }, { id: "invest", label: "Investors" }];

export default function CommunityPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me } = useMe();
  const access = me.communityAccess || { daily: true, invest: true };
  const visible = GROUPS.filter(g => access[g.id] !== false);
  const [group, setGroup] = useState(visible[0]?.id || "daily");
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [blocked, setBlocked] = useState(false);
  const box = useRef(null);

  async function load(g, scroll = true) {
    try {
      const d = await api(`/api/community/${g}`); setItems(d.items); setBlocked(false);
      if (scroll) setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    } catch (e) { if (String(e.message).includes("access")) { setBlocked(true); setItems([]); } }
  }
  useEffect(() => {
    load(group);
    const t = setInterval(() => load(group, false), 7000);
    return () => clearInterval(t);
  }, [group]);

  async function send() {
    const t = text.replace(/\r\n/g, "\n");
    if (!t.trim()) return;
    try { await api(`/api/community/${group}`, { method: "POST", body: { text: t } }); setText(""); await load(group); } catch {}
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }
  async function del(id) {
    try { await api(`/api/community/message/${id}`, { method: "DELETE" }); await load(group, false); } catch {}
  }

  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl text-gold">Community</h1>
        <div className="flex gap-2">
          {visible.map(g => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              className={`px-4 py-1.5 rounded-full text-sm transition ${g.id === group ? "bg-gold2 text-white font-semibold" : "border border-line text-cream/70 hover:text-cream"}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={box} className="card mt-5 h-[62vh] overflow-y-auto p-4 space-y-3">
        {items.map(m => {
          const mine = m.authorType === "user" && m.user && String(m.user) === String(me.id);
          const staff = m.authorType === "staff" || m.authorType === "ai" || m.authorType === "persona";
          return (
            <div key={m._id} className="group flex gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gold2/15 grid place-items-center font-display text-gold2 overflow-hidden">
                {m.authorAvatar ? <img src={m.authorAvatar} alt="" className="h-full w-full object-cover" /> : (m.authorName || "?")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-cream/50">
                  {m.authorName || "member"} {staff && <span className="text-gold2">• staff</span>}
                  <span className="text-cream/30"> · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && <button onClick={() => del(m._id)} className="ml-2 align-middle text-cream/30 hover:text-gold2 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12} /></button>}
                </div>
                <Formatted text={m.text} />
              </div>
            </div>
          );
        })}
        {blocked && <div className="text-cream/50 text-sm">You do not have access to this group.</div>}
        {!blocked && !items.length && <div className="text-cream/50 text-sm">No messages yet.</div>}
      </div>

      <div className="flex items-end gap-2 mt-3">
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={1} disabled={blocked}
          placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
          className="field flex-1 resize-none max-h-32 disabled:opacity-40" />
        <button className="btn-gold h-11 w-12 shrink-0 !px-0" onClick={send} disabled={blocked}><Send size={16} /></button>
      </div>
    </div>
  );
}

function Formatted({ text }) {
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return (
    <div className="text-cream whitespace-pre-wrap break-words">
      {parts.map((p, i) => /^https?:\/\//.test(p)
        ? <a key={i} href={p} target="_blank" rel="noreferrer" className="underline text-gold2">{p}</a>
        : <span key={i}>{p}</span>)}
    </div>
  );
}
