"use client";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { LifeBuoy, Send } from "lucide-react";

export default function SupportPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const [items, setItems] = useState([]);
  const [ended, setEnded] = useState(false);
  const [text, setText] = useState("");
  const box = useRef(null);

  async function load(scroll = true) {
    const d = await api("/api/support");
    setItems(d.items); setEnded(d.ended);
    if (scroll) setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => { load(); const t = setInterval(() => load(false), 8000); return () => clearInterval(t); }, []);

  async function send() {
    const t = text.replace(/\r\n/g, "\n");
    if (!t.trim()) return;
    try { await api("/api/support", { method: "POST", body: { text: t } }); setText(""); await load(); } catch {}
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-4">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-gold2/10 text-gold2"><LifeBuoy size={20} /></span>
        <div><h1 className="font-display text-2xl md:text-3xl text-gold">Support</h1>
          <p className="text-sm text-cream/55">We usually reply within a few hours.</p></div>
      </div>

      <div ref={box} className="card h-[60vh] overflow-y-auto p-4 space-y-3">
        {items.map(m => m.from === "system" ? (
          <div key={m._id} className="text-center text-xs text-cream/45 py-1">— {m.text} —</div>
        ) : (
          <div key={m._id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.from === "user" ? "bg-gold2 text-white" : "bg-black/[0.04] border border-black/[0.08] text-cream"}`}>
              <Formatted text={m.text} light={m.from === "user"} />
              <div className={`mt-1 text-[10px] ${m.from === "user" ? "text-white/70" : "text-cream/40"}`}>{m.from === "staff" ? "Shein Support · " : ""}{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {!items.length && <div className="text-center text-cream/50 text-sm py-10">Send us a message to start a conversation.</div>}
      </div>

      {ended && <div className="mt-2 text-center text-xs text-cream/50">This chat was closed. Send a message to reopen it.</div>}

      <div className="flex items-end gap-2 mt-3">
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={1}
          placeholder="Type your message…  (Enter to send, Shift+Enter for a new line)"
          className="field flex-1 resize-none max-h-32" />
        <button className="btn-gold h-11 w-12 shrink-0 !px-0" onClick={send}><Send size={16} /></button>
      </div>
    </div>
  );
}

// Preserve line breaks and turn bare URLs into links.
function Formatted({ text, light }) {
  const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((p, i) => /^https?:\/\//.test(p)
        ? <a key={i} href={p} target="_blank" rel="noreferrer" className={`underline ${light ? "text-white" : "text-gold2"}`}>{p}</a>
        : <span key={i}>{p}</span>)}
    </div>
  );
}
