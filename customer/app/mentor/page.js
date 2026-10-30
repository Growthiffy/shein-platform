"use client";
import { useEffect, useRef, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Send, Trash2, Paperclip } from "lucide-react";

export default function MentorPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, refresh } = useMe();
  const [list, setList] = useState([]);
  const [picked, setPicked] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState([]);
  const [text, setText] = useState("");
  const box = useRef(null);
  const fileRef = useRef(null);

  // 1:1 room key: mentor:<mentorId>:<myUserId>.
  const roomOf = (mentorId) => `mentor:${mentorId}:${me.id}`;

  async function load() {
    const d = await api("/api/mentor"); setList(d.items);
    if (me.mentor) {
      const m = d.items.find(x => String(x._id) === String(me.mentor));
      setPicked(m || null);
      if (m) loadChat(m._id);
    }
  }
  async function loadChat(mentorId) {
    const d = await api(`/api/community/${roomOf(mentorId)}`);
    setMsgs(d.items); setTyping(d.typing || []);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => { load(); }, []);
  // Poll the mentor chat so auto-replies appear without a manual refresh.
  useEffect(() => {
    if (!picked) return;
    const t = setInterval(() => loadChat(picked._id), 12000);
    return () => clearInterval(t);
  }, [picked?._id]);

  async function choose(id) {
    try { const d = await api("/api/mentor/select", { method: "POST", body: { id } }); setPicked(d.mentor); loadChat(d.mentor._id); await refresh(); }
    catch (e) { alert(e.message); }
  }
  async function send() {
    const t = text.replace(/\r\n/g, "\n");
    if (!t.trim() || !picked) return;
    await api(`/api/community/${roomOf(picked._id)}`, { method: "POST", body: { text: t } });
    setText(""); loadChat(picked._id);
  }
  async function sendFile(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || !picked) return;
    if (file.size > 3 * 1024 * 1024) return alert("File too large (max 3MB).");
    const image = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    try { await api(`/api/community/${roomOf(picked._id)}`, { method: "POST", body: { image, fileName: file.name, text: "" } }); loadChat(picked._id); }
    catch (err) { alert(err.message); }
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }
  async function del(id) {
    try { await api(`/api/community/message/${id}`, { method: "DELETE" }); if (picked) loadChat(picked._id); } catch {}
  }

  return (
    <div className="page">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Mentor</h1>
      <p className="text-cream/60">Pick a personal guide. One-time choice — contact support to change.</p>

      {!picked && (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {list.map(m => (
            <div key={m._id} className="card card-hover p-6">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl text-gold">{m.name}</h3>
                <StatusDot status={m.status} />
              </div>
              <div className="text-cream/60 text-sm">{m.title} · <MentorPresence m={m} /></div>
              <p className="mt-2 text-cream/80 text-sm">{m.bio}</p>
              <button className="btn-gold mt-4" onClick={() => choose(m._id)}>CHOOSE</button>
            </div>
          ))}
          {!list.length && <div className="text-cream/50 text-sm">No mentors available.</div>}
        </div>
      )}

      {picked && (
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="card p-6 md:col-span-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-2xl text-gold">{picked.name}</h3>
              <StatusDot status={picked.status} />
            </div>
            <div className="text-cream/60 text-sm">{picked.title} · <MentorPresence m={picked} /></div>
            <p className="mt-2 text-cream/80 text-sm">{picked.bio}</p>
            <div className="mt-3 text-xs text-cream/50">To change mentor, contact support.</div>
          </div>
          <div className="card p-4 md:col-span-2 flex flex-col">
            <div ref={box} className="h-[55vh] overflow-y-auto space-y-3 pr-1">
              {msgs.map(m => {
                const mine = m.authorType === "user";
                return (
                  <div key={m._id} className={`group flex ${mine ? "justify-end" : ""}`}>
                    <div className={`px-3 py-2 rounded-xl max-w-[75%] ${mine ? "bg-gold2 text-white" : "bg-black/[0.04] border border-line"}`}>
                      <div className={`text-xs mb-1 flex items-center gap-2 ${mine ? "text-white/60" : "text-cream/50"}`}>
                        <span>{m.authorName || (mine ? "you" : picked.name)}</span>
                        <span className={mine ? "text-white/40" : "text-cream/30"}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {mine && <button onClick={() => del(m._id)} className="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white transition"><Trash2 size={11} /></button>}
                      </div>
                      {m.replyTo?.text && (
                        <div className={`mb-1 border-l-2 pl-2 ${mine ? "border-white/50" : "border-gold2/60"}`}>
                          <div className={`text-[11px] font-medium ${mine ? "text-white/80" : "text-gold2"}`}>{m.replyTo.authorName}</div>
                          <div className={`text-[11px] truncate ${mine ? "text-white/60" : "text-cream/50"}`}>{m.replyTo.text}</div>
                        </div>
                      )}
                      {m.image && (m.image.startsWith("data:application/pdf")
                        ? <a href={m.image} download={m.fileName || "file.pdf"} className={`mt-1 inline-flex items-center gap-1 underline text-xs ${mine ? "text-white" : "text-gold2"}`}>📄 {m.fileName || "document.pdf"}</a>
                        : <img src={m.image} alt={m.fileName || ""} className="mt-1 max-h-60 rounded-lg" />)}
                      {m.text && <Formatted text={m.text} light={mine} />}
                    </div>
                  </div>
                );
              })}
              {!msgs.length && <div className="text-cream/50 text-sm">Say hello to your mentor.</div>}
              {typing.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-cream/50 pt-1">
                  <span className="flex gap-0.5">
                    <i className="h-1.5 w-1.5 rounded-full bg-cream/40" style={{ animation: "dots 1.2s infinite" }} />
                    <i className="h-1.5 w-1.5 rounded-full bg-cream/40" style={{ animation: "dots 1.2s infinite .2s" }} />
                    <i className="h-1.5 w-1.5 rounded-full bg-cream/40" style={{ animation: "dots 1.2s infinite .4s" }} />
                  </span>
                  {typing.join(", ")} {typing.length > 1 ? "are" : "is"} typing…
                </div>
              )}
            </div>
            {/* composer */}
            <div className="flex items-end gap-2 mt-3">
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={sendFile} />
              <button className="btn-outline h-11 w-11 shrink-0 !px-0 grid place-items-center" onClick={() => fileRef.current?.click()} title="Attach image / file"><Paperclip size={16} /></button>
              <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={1}
                placeholder="Message your mentor…  (Enter to send, Shift+Enter for a new line)" className="field flex-1 resize-none max-h-32" />
              <button className="btn-gold h-11 w-12 shrink-0 !px-0" onClick={send}><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const c = status === "online" ? "bg-emerald-500" : status === "away" ? "bg-amber-500" : "bg-cream/30";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} title={status || "offline"} />;
}
function MentorPresence({ m }) {
  if (m.status === "online") return <span className="text-emerald-500">online</span>;
  if (m.status === "away") return <span className="text-amber-600">away</span>;
  const ago = m.lastSeenAt ? timeSince(m.lastSeenAt) : "a while ago";
  return <span className="text-cream/45">last seen {ago}</span>;
}
function timeSince(d) {
  const m = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Formatted({ text, light }) {
  const parts = String(text).split(/(@[A-Za-z0-9._-]{2,30}|https?:\/\/[^\s]+)/g);
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((p, i) => {
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className={`underline ${light ? "text-white" : "text-gold2"}`}>{p}</a>;
        if (/^@[A-Za-z0-9._-]{2,30}$/.test(p)) return <span key={i} className={light ? "font-medium underline" : "text-gold2 font-medium"}>{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}
