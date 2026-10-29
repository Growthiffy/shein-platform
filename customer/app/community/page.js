"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

const GROUPS = [{ id: "daily", label: "Daily Analysts" }, { id: "invest", label: "Investors" }];

export default function Community() {
  const r = useRouter();
  const [group, setGroup] = useState("daily");
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [access, setAccess] = useState({ daily: true, invest: true });
  const [blocked, setBlocked] = useState(false);
  const box = useRef(null);

  async function load(g) {
    try {
      const d = await api(`/api/community/${g}`);
      setItems(d.items); setBlocked(false);
      setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    } catch (e) {
      if (String(e.message).includes("access")) { setBlocked(true); setItems([]); }
    }
  }
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    api("/api/me").then(d => setAccess(d.user?.communityAccess || { daily: true, invest: true })).catch(() => {});
  }, []);
  useEffect(() => {
    if (!getToken()) return;
    load(group);
    const t = setInterval(() => load(group), 7000);
    return () => clearInterval(t);
  }, [group]);

  async function send() {
    if (!text.trim()) return;
    try { await api(`/api/community/${group}`, { method: "POST", body: { text } }); setText(""); await load(group); } catch {}
  }

  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="px-6 py-4 border-b border-gold/10 flex justify-between">
        <Link href="/dashboard" className="font-display text-xl text-gold">← Shein</Link>
        <div className="flex gap-2">
          {GROUPS.filter(g => access[g.id] !== false).map(g => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              className={`px-3 py-1 rounded-full text-sm ${g.id === group ? "gold-grad text-black" : "border border-gold/30 text-cream/70"}`}>
              {g.label}
            </button>
          ))}
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-6">
        <div ref={box} className="card h-[65vh] overflow-y-auto p-4 space-y-3">
          {items.map(m => (
            <div key={m._id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center font-display text-gold">
                {(m.authorName || "?")[0]?.toUpperCase()}
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
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Write a message…" disabled={blocked}
            className="flex-1 bg-black/40 border border-gold/20 rounded-full px-4 py-3 outline-none focus:border-gold disabled:opacity-40" />
          <button className="btn-gold" onClick={send} disabled={blocked}>SEND</button>
        </div>
      </section>
    </main>
  );
}
