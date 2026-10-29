"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

export default function Support() {
  const [threads, setThreads] = useState([]);
  const [sel, setSel] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const box = useRef(null);

  async function loadThreads() { setThreads((await api("/api/admin/support")).items); }
  async function openThread(userId) {
    setSel(userId);
    const d = await api(`/api/admin/support/${userId}`); setMsgs(d.items);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    loadThreads();
  }
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 10000); return () => clearInterval(t); }, []);

  async function reply() {
    if (!text.trim() || !sel) return;
    await api(`/api/admin/support/${sel}`, { method: "POST", body: { text } });
    setText(""); openThread(sel);
  }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4 font-display">Support</h1>
      <div className="grid grid-cols-3 gap-4" style={{ height: "72vh" }}>
        <div className="card overflow-y-auto">
          {threads.map(t => (
            <button key={t.userId} onClick={() => openThread(t.userId)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 ${sel === t.userId ? "bg-gold/10" : "hover:bg-white/5"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-cream">{t.username || t.email || "member"}</span>
                {t.unread > 0 && <span className="rounded-full gold-grad text-black text-[10px] font-bold px-1.5">{t.unread}</span>}
              </div>
              <div className="text-xs text-cream/50 truncate">{t.last}</div>
            </button>
          ))}
          {!threads.length && <div className="p-4 text-cream/50 text-sm">No support threads.</div>}
        </div>

        <div className="card col-span-2 flex flex-col">
          {!sel ? <div className="m-auto text-cream/50">Select a thread.</div> : (
            <>
              <div ref={box} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map(m => (
                  <div key={m._id} className={`flex ${m.from === "staff" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.from === "staff" ? "gold-grad text-black" : "bg-white/5 border border-gold/15 text-cream"}`}>
                      <div>{m.text}</div>
                      <div className={`mt-1 text-[10px] ${m.from === "staff" ? "text-black/50" : "text-cream/40"}`}>{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-3 border-t border-white/5">
                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && reply()} placeholder="Reply…" className="flex-1" />
                <button className="btn" onClick={reply}><Send size={15} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
