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
  const box = useRef(null);

  async function load(g) {
    const d = await api(`/api/community/${g}`);
    setItems(d.items);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
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
          {GROUPS.map(g => (
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
                <div className="text-xs text-cream/50">{m.authorName || "member"} {m.authorType === "ai" && <span className="text-gold">• verified</span>}</div>
                <div className="text-cream">{m.text}</div>
              </div>
            </div>
          ))}
          {!items.length && <div className="text-cream/50 text-sm">No messages yet.</div>}
        </div>
        <div className="flex gap-2 mt-3">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Write a message…"
            className="flex-1 bg-black/40 border border-gold/20 rounded-full px-4 py-3 outline-none focus:border-gold" />
          <button className="btn-gold" onClick={send}>SEND</button>
        </div>
      </section>
    </main>
  );
}
