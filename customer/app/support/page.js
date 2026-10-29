"use client";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { LifeBuoy, Send } from "lucide-react";

export default function SupportPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const box = useRef(null);

  async function load() {
    const d = await api("/api/support");
    setItems(d.items);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function send() {
    if (!text.trim()) return;
    try { await api("/api/support", { method: "POST", body: { text } }); setText(""); await load(); } catch {}
  }

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold"><LifeBuoy size={20} /></span>
        <div><h1 className="font-display text-2xl md:text-3xl text-gold">Support</h1>
          <p className="text-sm text-cream/55">We usually reply within a few hours.</p></div>
      </div>

      <div ref={box} className="card h-[60vh] overflow-y-auto p-4 space-y-3">
        {items.map(m => (
          <div key={m._id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.from === "user" ? "gold-grad text-black" : "bg-white/5 border border-gold/15 text-cream"}`}>
              <div>{m.text}</div>
              <div className={`mt-1 text-[10px] ${m.from === "user" ? "text-black/50" : "text-cream/40"}`}>{m.from === "staff" ? "Shein Support · " : ""}{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {!items.length && <div className="text-center text-cream/50 text-sm py-10">Send us a message to start a conversation.</div>}
      </div>

      <div className="flex gap-2 mt-3">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Type your message…" className="field rounded-full flex-1" />
        <button className="btn-gold" onClick={send}><Send size={16} /></button>
      </div>
    </div>
  );
}
