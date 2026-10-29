"use client";
import { useEffect, useRef, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

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

  async function load(g) {
    try {
      const d = await api(`/api/community/${g}`); setItems(d.items); setBlocked(false);
      setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    } catch (e) { if (String(e.message).includes("access")) { setBlocked(true); setItems([]); } }
  }
  useEffect(() => {
    load(group);
    const t = setInterval(() => load(group), 7000);
    return () => clearInterval(t);
  }, [group]);

  async function send() {
    if (!text.trim()) return;
    try { await api(`/api/community/${group}`, { method: "POST", body: { text } }); setText(""); await load(group); } catch {}
  }

  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl text-gold">Community</h1>
        <div className="flex gap-2">
          {visible.map(g => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              className={`px-4 py-1.5 rounded-full text-sm transition ${g.id === group ? "gold-grad text-white font-semibold" : "border border-gold/30 text-cream/70 hover:text-gold"}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={box} className="card mt-5 h-[62vh] overflow-y-auto p-4 space-y-3">
        {items.map(m => (
          <div key={m._id} className="flex gap-3">
            <div className="h-9 w-9 shrink-0 rounded-full bg-gold/15 grid place-items-center font-display text-gold overflow-hidden">
              {m.authorAvatar ? <img src={m.authorAvatar} alt="" className="h-full w-full object-cover" /> : (m.authorName || "?")[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-cream/50">{m.authorName || "member"} {(m.authorType === "staff" || m.authorType === "ai" || m.authorType === "persona") && <span className="text-gold">• staff</span>}</div>
              <div className="text-cream">{m.text}</div>
            </div>
          </div>
        ))}
        {blocked && <div className="text-cream/50 text-sm">You do not have access to this group.</div>}
        {!blocked && !items.length && <div className="text-cream/50 text-sm">No messages yet.</div>}
      </div>

      <div className="flex gap-2 mt-3">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Write a message…" disabled={blocked} className="field rounded-full flex-1 disabled:opacity-40" />
        <button className="btn-gold" onClick={send} disabled={blocked}><Send size={16} /></button>
      </div>
    </div>
  );
}
