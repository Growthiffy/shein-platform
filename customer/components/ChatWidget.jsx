"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, LifeBuoy } from "lucide-react";
import { api } from "@/lib/api";

const TOPICS = ["Recharge / Deposit", "Withdrawal", "Verification", "Other"];

// Always-visible floating support bubble (bottom-right). Opens an inline chat on
// the existing support API, polls for staff replies, shows an unread badge, and
// lets the member end the chat. Mounted app-wide via AppShell.
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const box = useRef(null);
  const openRef = useRef(false);
  const seenRef = useRef(0);
  useEffect(() => { openRef.current = open; }, [open]);

  async function load(scroll = false) {
    try {
      const d = await api("/api/support");
      const items = d.items || [];
      // Count new staff/system replies that arrived while the panel was closed.
      const prevCount = seenRef.current;
      const staffCount = items.filter(m => m.from !== "user").length;
      if (!openRef.current && items.length && staffCount > prevCount) setUnread(u => u + (staffCount - prevCount));
      seenRef.current = staffCount;
      setMsgs(items);
      if (scroll || openRef.current) setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    } catch {}
  }

  // Light background poll so the unread badge updates even while closed.
  useEffect(() => {
    load();
    const t = setInterval(() => load(false), open ? 6000 : 20000);
    return () => clearInterval(t);
  }, [open]);

  function toggle() { setOpen(o => { const n = !o; if (n) { setUnread(0); setTimeout(() => load(true), 50); } return n; }); }
  async function send(t) {
    const body = (t ?? text).replace(/\r\n/g, "\n").trim();
    if (!body) return;
    setText("");
    try { await api("/api/support", { method: "POST", body: { text: body } }); await load(true); } catch {}
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }
  async function endChat() {
    if (!confirmEnd) { setConfirmEnd(true); setTimeout(() => setConfirmEnd(false), 4000); return; }
    setConfirmEnd(false);
    try { await api("/api/support/end", { method: "POST" }); seenRef.current = 0; await load(true); } catch {}
  }

  return (
    <>
      {/* panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-[60] w-[92vw] max-w-sm rounded-2xl border border-gold/25 bg-ink shadow-2xl overflow-hidden flex flex-col" style={{ height: "min(70vh, 540px)" }}>
          <div className="flex items-center justify-between gap-2 px-4 py-3 gold-grad text-white">
            <div className="flex items-center gap-2"><LifeBuoy size={18} /><div><div className="font-semibold text-sm">Shein Support</div><div className="text-[11px] text-white/80">Usually replies within a few hours</div></div></div>
            <div className="flex items-center gap-2">
              {!!msgs.length && (
                <button onClick={endChat} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${confirmEnd ? "bg-white text-red-600" : "bg-white/20 hover:bg-white/30 text-white"}`}>
                  {confirmEnd ? "Tap to confirm" : "End chat"}
                </button>
              )}
              <button onClick={toggle} className="text-white/80 hover:text-white"><X size={18} /></button>
            </div>
          </div>
          <div ref={box} className="flex-1 overflow-y-auto p-3 space-y-2 bg-ink2/40">
            {!msgs.length && (
              <div className="text-center py-4">
                <div className="text-cream/60 text-sm">👋 How can we help? Pick a topic or type below.</div>
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {TOPICS.map(t => <button key={t} onClick={() => send(`Hi, I need help with: ${t}`)} className="rounded-full border border-gold/30 text-xs px-3 py-1 text-cream/80 hover:border-gold/60">{t}</button>)}
                </div>
              </div>
            )}
            {msgs.map(m => {
              const mine = m.from === "user";
              const sys = m.from === "system";
              return (
                <div key={m._id} className={`flex ${mine ? "justify-end" : ""}`}>
                  <div className={`px-3 py-2 rounded-xl max-w-[80%] text-sm ${mine ? "bg-gold2 text-white" : sys ? "bg-black/[0.05] text-cream/70 italic" : "bg-black/[0.05] border border-line text-cream"}`}>
                    {!mine && !sys && <div className="text-[10px] text-gold2 mb-0.5">Support</div>}
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div className={`text-[10px] mt-0.5 ${mine ? "text-white/60" : "text-cream/40"}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-line p-2">
            <div className="flex items-end gap-2">
              <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={1} placeholder="Type a message…" className="field flex-1 resize-none max-h-24 text-sm" />
              <button className="btn-gold h-10 w-11 shrink-0 !px-0 grid place-items-center" onClick={() => send()}><Send size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {/* floating bubble */}
      <button onClick={toggle} aria-label="Support" className="fixed bottom-20 md:bottom-6 right-4 z-[60] grid h-14 w-14 place-items-center rounded-full gold-grad text-white shadow-xl hover:scale-105 transition">
        {open ? <X size={22} /> : <MessageCircle size={24} />}
        {!open && unread > 0 && <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 text-white text-[11px] px-1">{unread}</span>}
      </button>
    </>
  );
}
