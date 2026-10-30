"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Send, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

const TABS = [["active", "Active"], ["ended", "Ended"], ["all", "All"]];

export default function Support() {
  const [tab, setTab] = useState("active");
  const [threads, setThreads] = useState([]);
  const [sel, setSel] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [ended, setEnded] = useState(false);
  const [text, setText] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const box = useRef(null);

  async function loadThreads() { setThreads((await api(`/api/admin/support?status=${tab}`)).items); }
  async function openThread(userId) {
    setSel(userId); setConfirmDel(false);
    const d = await api(`/api/admin/support/${userId}`); setMsgs(d.items); setEnded(d.ended);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    loadThreads();
  }
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 10000); return () => clearInterval(t); }, [tab]);
  // Deep-link from a notification: /support?user=<id> opens that thread.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("user");
    if (u) { setTab("all"); openThread(u); }
  }, []);

  async function reply() {
    const t = text.replace(/\r\n/g, "\n");
    if (!t.trim() || !sel) return;
    await api(`/api/admin/support/${sel}`, { method: "POST", body: { text: t } });
    setText(""); openThread(sel);
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }
  async function endChat() { await api(`/api/admin/support/${sel}/end`, { method: "POST" }); openThread(sel); }
  async function reopen() { await api(`/api/admin/support/${sel}/reopen`, { method: "POST" }); openThread(sel); }
  async function del() {
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 4000); return; }
    await api(`/api/admin/support/${sel}`, { method: "DELETE" });
    setSel(null); setMsgs([]); loadThreads();
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl text-gold font-display">Support</h1>
        <div className="flex gap-1">
          {TABS.map(([v, t]) => (
            <button key={v} onClick={() => setTab(v)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === v ? "bg-gold/15 text-gold" : "text-cream/70 hover:bg-white/5"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4" style={{ height: "72vh" }}>
        <div className="card overflow-y-auto">
          {threads.map(t => (
            <button key={t.userId} onClick={() => openThread(t.userId)}
              className={`w-full text-left px-4 py-3 border-b border-line ${sel === t.userId ? "bg-gold/10" : "hover:bg-black/[0.03]"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-cream truncate">{t.username || t.email || "member"}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {t.ended && <span className="chip">ended</span>}
                  {t.unread > 0 && <span className="rounded-full bg-gold2 text-white text-[10px] font-bold px-1.5">{t.unread}</span>}
                </div>
              </div>
              <div className="text-xs text-cream/50 truncate">{t.last}</div>
            </button>
          ))}
          {!threads.length && <div className="p-4 text-cream/50 text-sm">No {tab === "all" ? "" : tab} threads.</div>}
        </div>

        <div className="card col-span-2 flex flex-col">
          {!sel ? <div className="m-auto text-cream/50">Select a thread.</div> : (
            <>
              <div className="flex items-center justify-end gap-2 p-2 border-b border-line">
                {ended
                  ? <button className="btn-ghost text-xs" onClick={reopen}><RotateCcw size={13} /> Reopen</button>
                  : <button className="btn-ghost text-xs" onClick={endChat}><CheckCircle2 size={13} /> End chat</button>}
                <button className={`btn-ghost text-xs ${confirmDel ? "!border-red-400 !text-red-400" : ""}`} onClick={del}>
                  <Trash2 size={13} /> {confirmDel ? "Tap to confirm" : "Delete"}
                </button>
              </div>
              <div ref={box} className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map(m => m.from === "system" ? (
                  <div key={m._id} className="text-center text-xs text-cream/45 py-1">— {m.text} —</div>
                ) : (
                  <div key={m._id} className={`flex ${m.from === "staff" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.from === "staff" ? "bg-gold2 text-white" : "bg-black/[0.04] border border-line text-cream"}`}>
                      <div className="whitespace-pre-wrap break-words">{m.text}</div>
                      <div className={`mt-1 text-[10px] ${m.from === "staff" ? "text-white/70" : "text-cream/40"}`}>{new Date(m.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-2 p-3 border-t border-line">
                <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={1}
                  placeholder="Reply…  (Enter to send, Shift+Enter for a new line)" className="flex-1 resize-none max-h-32" />
                <button className="btn" onClick={reply}><Send size={15} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
