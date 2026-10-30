"use client";
import { useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Send, UsersRound } from "lucide-react";

export default function MyJuniors() {
  const [mentor, setMentor] = useState(null);
  const [notMentor, setNotMentor] = useState(false);
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);     // selected mentee { _id, name }
  const [group, setGroup] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const box = useRef(null);
  const fileRef = useRef(null);
  const typingSentAt = useRef(0);

  async function loadMentees() {
    try {
      const d = await api("/api/mentor-admin/mentees");
      if (!d.mentor) { setNotMentor(true); return; }
      setMentor(d.mentor); setList(d.items);
    } catch (e) { setNotMentor(true); }
  }
  async function openRoom(u) {
    setActive(u);
    const d = await api(`/api/mentor-admin/room/${u._id}`);
    setGroup(d.group); setMsgs(d.items);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  async function refreshRoom() {
    if (!active) return;
    try { const d = await api(`/api/mentor-admin/room/${active._id}`); setMsgs(d.items); } catch {}
  }

  useEffect(() => { loadMentees(); }, []);
  // Poll the open room + the mentee list so new member messages surface.
  useEffect(() => {
    const t = setInterval(() => { refreshRoom(); loadMentees(); }, 6000);
    return () => clearInterval(t);
  }, [active?._id]);

  // Presence heartbeat while a room is open → mutes personas + mentor auto-reply
  // and shows the member a real "typing…" indicator.
  useEffect(() => {
    if (!group) return;
    const beat = (typing) => api("/api/mentor-admin/presence", { method: "POST", body: { group, typing } }).catch(() => {});
    beat(false);
    const t = setInterval(() => beat(false), 20000);
    return () => { clearInterval(t); api("/api/mentor-admin/presence/clear", { method: "POST", body: { group } }).catch(() => {}); };
  }, [group]);

  function onType(v) {
    setText(v);
    const now = Date.now();
    if (group && now - typingSentAt.current > 3000) {
      typingSentAt.current = now;
      api("/api/mentor-admin/presence", { method: "POST", body: { group, typing: true } }).catch(() => {});
    }
  }
  async function send() {
    const t = text.replace(/\r\n/g, "\n").trim();
    if (!t || !active) return;
    setText("");
    await api(`/api/mentor-admin/room/${active._id}`, { method: "POST", body: { text: t } }).catch(e => alert(e.message));
    refreshRoom(); loadMentees();
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  async function sendFile(e) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || !active) return;
    if (file.size > 3 * 1024 * 1024) return alert("File too large (max 3MB).");
    const image = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
    await api(`/api/mentor-admin/room/${active._id}`, { method: "POST", body: { image, fileName: file.name, text: "" } }).catch(err => alert(err.message));
    refreshRoom();
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

  if (notMentor) return (
    <Shell>
      <div className="card p-8 text-center text-cream/60">
        <UsersRound className="mx-auto mb-2 text-gold" /> You are not set up as a mentor. An owner can enable this under <b>Admins → Make mentor</b>.
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-1"><UsersRound size={20} className="text-gold" /><h1 className="text-2xl text-gold font-display">My Juniors</h1></div>
      <p className="text-cream/50 text-sm mb-5">Members assigned to {mentor?.name || "you"}. Reply as yourself — while a chat is open, the AI community stays quiet here.</p>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* mentee list */}
        <div className="card p-2 space-y-1 h-max max-h-[70vh] overflow-y-auto">
          {list.map(u => (
            <button key={u._id} onClick={() => openRoom(u)}
              className={`w-full text-left rounded-lg px-3 py-2 transition ${active?._id === u._id ? "bg-gold/15" : "hover:bg-white/5"}`}>
              <div className="flex items-center justify-between">
                <span className="text-cream font-medium">{u.name}</span>
                {u.waiting && <span className="h-2 w-2 rounded-full bg-emerald-500" title="waiting on you" />}
              </div>
              {u.mentorName && <div className="text-[10px] text-gold/70">as {u.mentorName}</div>}
              <div className="text-xs text-cream/45 truncate">{u.lastText || "no messages yet"}</div>
            </button>
          ))}
          {!list.length && <div className="text-cream/50 text-sm p-3">No members assigned yet.</div>}
        </div>

        {/* room */}
        <div className="card p-4 lg:col-span-2 flex flex-col">
          {!active && <div className="text-cream/50 text-sm m-auto">Pick a member to start chatting.</div>}
          {active && (
            <>
              <div className="font-medium text-cream mb-2 border-b border-line pb-2 flex items-center gap-2">{active.name}{active.mentorName && <span className="text-xs text-gold/80 font-normal">· replying as {active.mentorName}</span>}</div>
              <div ref={box} className="h-[55vh] overflow-y-auto space-y-3 pr-1">
                {msgs.map(m => {
                  const mine = m.authorType === "mentor";
                  return (
                    <div key={m._id} className={`flex ${mine ? "justify-end" : ""}`}>
                      <div className={`px-3 py-2 rounded-xl max-w-[75%] ${mine ? "bg-gold/20 text-cream" : "bg-white/[0.04] border border-line"}`}>
                        <div className="text-[11px] mb-1 text-cream/45">{m.authorName || (mine ? mentor?.name : active.name)} · {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        {m.replyTo?.text && <div className="mb-1 border-l-2 border-gold/50 pl-2 text-[11px] text-cream/50 truncate">{m.replyTo.authorName}: {m.replyTo.text}</div>}
                        {m.image && (m.image.startsWith("data:application/pdf")
                          ? <a href={m.image} download={m.fileName || "file.pdf"} className="inline-flex items-center gap-1 underline text-xs text-gold">📄 {m.fileName || "document.pdf"}</a>
                          : <img src={m.image} alt={m.fileName || ""} className="max-h-48 rounded-lg" />)}
                        {m.text && <div className="whitespace-pre-wrap break-words text-sm">{m.text}</div>}
                      </div>
                    </div>
                  );
                })}
                {!msgs.length && <div className="text-cream/50 text-sm">No messages yet. Say hello.</div>}
              </div>
              <div className="flex items-end gap-2 mt-3">
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={sendFile} />
                <button className="btn-ghost h-11 w-11 shrink-0 !px-0 grid place-items-center" onClick={() => fileRef.current?.click()} title="Attach">📎</button>
                <textarea value={text} onChange={e => onType(e.target.value)} onKeyDown={onKey} rows={1}
                  placeholder="Reply as mentor…  (Enter to send, Shift+Enter new line)" className="flex-1 resize-none max-h-32" />
                <button className="btn h-11 w-12 shrink-0 !px-0 grid place-items-center" onClick={send}><Send size={16} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
