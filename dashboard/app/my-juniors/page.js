"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Send, UsersRound, Search, Check, CheckCheck, Paperclip } from "lucide-react";

export default function MyJuniors() {
  const [notMentor, setNotMentor] = useState(false);
  const [mentors, setMentors] = useState([]);       // [{_id,name,avatar,memberCount,unread}]
  const [activeMentor, setActiveMentor] = useState(""); // mentor _id
  const [all, setAll] = useState([]);               // all mentees (tagged mentorId)
  const [active, setActive] = useState(null);        // selected mentee { _id, name, mentorName, avatar }
  const [group, setGroup] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const box = useRef(null);
  const fileRef = useRef(null);
  const typingSentAt = useRef(0);

  async function loadMentees() {
    try {
      const d = await api("/api/mentor-admin/mentees");
      if (!d.mentors || !d.mentors.length) { setNotMentor(true); return; }
      setMentors(d.mentors);
      setAll(d.items || []);
      setActiveMentor(cur => cur || String(d.mentors[0]._id));
    } catch { setNotMentor(true); }
  }
  async function openRoom(u) {
    setActive(u);
    const d = await api(`/api/mentor-admin/room/${u._id}`);
    setGroup(d.group); setMsgs(d.items);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    loadMentees(); // refresh unread (room was just marked read)
  }
  async function refreshRoom() {
    if (!active) return;
    try { const d = await api(`/api/mentor-admin/room/${active._id}`); setMsgs(d.items); } catch {}
  }

  useEffect(() => { loadMentees(); }, []);
  // Deep-link from a mentor notification: /my-juniors?mentee=<id> opens that chat.
  // Runs ONCE after the list first loads (a ref guard stops it re-firing on every
  // poll and yanking the operator back to this chat).
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || !all.length) return;
    const id = new URLSearchParams(window.location.search).get("mentee");
    if (!id) { deepLinked.current = true; return; }
    const u = all.find(x => String(x._id) === String(id));
    if (u) { deepLinked.current = true; setActiveMentor(u.mentorId); openRoom(u); }
  }, [all.length]);
  // Poll the list for new messages / unread, and the open room for replies.
  useEffect(() => {
    const t = setInterval(() => { refreshRoom(); loadMentees(); }, 5000);
    return () => clearInterval(t);
  }, [active?._id]);

  // Presence heartbeat while a room is open → mutes personas + mentor auto-reply.
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
    refreshRoom(); loadMentees();
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

  // Mentees belonging to the active mentor, filtered + sorted (unread first).
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return all
      .filter(u => u.mentorId === String(activeMentor))
      .filter(u => !ql || (u.name || "").toLowerCase().includes(ql) || String(u.accountNumber || "").includes(ql));
  }, [all, activeMentor, q]);
  const activeMentorObj = mentors.find(m => String(m._id) === String(activeMentor));

  if (notMentor) return (
    <Shell>
      <div className="card p-8 text-center text-cream/60">
        <UsersRound className="mx-auto mb-2 text-gold" /> You are not assigned to any mentor. An owner can assign one under <b>Mentors → Owner</b>.
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-3"><UsersRound size={20} className="text-gold" /><h1 className="text-2xl text-gold font-display">My Juniors</h1></div>

      {/* Mentor switcher — one pill per mentor you control */}
      <div className="flex flex-wrap gap-2 mb-3">
        {mentors.map(m => {
          const on = String(m._id) === String(activeMentor);
          return (
            <button key={m._id} onClick={() => { setActiveMentor(String(m._id)); setActive(null); setMsgs([]); setGroup(null); }}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border transition ${on ? "border-gold bg-gold/12" : "border-line hover:bg-white/5"}`}>
              {m.avatar ? <img src={m.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-gold/20 grid place-items-center text-gold font-semibold">{(m.name || "?").charAt(0)}</span>}
              <span className="text-left">
                <span className={`block text-sm font-medium ${on ? "text-gold" : "text-cream"}`}>{m.name}</span>
                <span className="block text-[11px] text-cream/45">{m.memberCount} member{m.memberCount === 1 ? "" : "s"}</span>
              </span>
              {m.unread > 0 && <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 text-white text-[11px] px-1.5">{m.unread > 99 ? "99+" : m.unread}</span>}
            </button>
          );
        })}
      </div>

      {/* WhatsApp-style two-pane */}
      <div className="grid gap-0 rounded-xl overflow-hidden border border-line" style={{ gridTemplateColumns: "320px 1fr", height: "72vh" }}>
        {/* chat list */}
        <div className="flex flex-col bg-ink border-r border-line min-h-0">
          <div className="p-2 border-b border-line flex items-center gap-1.5">
            <Search size={14} className="text-cream/40 shrink-0" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search members…" className="flex-1 text-sm !py-1" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.map(u => {
              const on = active?._id === u._id;
              return (
                <button key={u._id} onClick={() => openRoom(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-line/60 text-left transition ${on ? "bg-gold/10" : "hover:bg-white/[0.03]"}`}>
                  {u.avatar ? <img src={u.avatar} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" /> : <span className="h-11 w-11 rounded-full bg-gold2/20 grid place-items-center text-gold2 font-semibold shrink-0">{(u.name || "?").charAt(0).toUpperCase()}</span>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-cream font-medium truncate">{u.name}</span>
                      {u.lastAt && <span className={`text-[10px] shrink-0 ${u.unread ? "text-emerald-400" : "text-cream/35"}`}>{timeShort(u.lastAt)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-cream/45 truncate">{u.lastFromMember ? "" : "✓ "}{u.lastText || "no messages yet"}</span>
                      {u.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 text-white text-[11px] px-1.5 shrink-0">{u.unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {!list.length && <div className="text-cream/50 text-sm p-4">{activeMentorObj ? "No members for this mentor yet." : "Pick a mentor above."}</div>}
          </div>
        </div>

        {/* thread */}
        <div className="flex flex-col min-h-0" style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 24px)" }}>
          {!active && <div className="text-cream/45 text-sm m-auto">Select a chat to start messaging.</div>}
          {active && (
            <>
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-line bg-ink">
                {active.avatar ? <img src={active.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-gold2/20 grid place-items-center text-gold2 font-semibold">{(active.name || "?").charAt(0).toUpperCase()}</span>}
                <div className="min-w-0">
                  <div className="text-cream font-medium truncate">{active.name}</div>
                  <div className="text-[11px] text-gold/70">replying as {active.mentorName}</div>
                </div>
              </div>

              <div ref={box} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                {msgs.map((m, i) => {
                  const mine = m.authorType === "mentor";
                  const showDay = i === 0 || dayKey(msgs[i - 1].createdAt) !== dayKey(m.createdAt);
                  return (
                    <div key={m._id}>
                      {showDay && <div className="flex justify-center my-2"><span className="text-[10px] text-cream/40 bg-ink2 rounded-full px-2.5 py-0.5">{dayLabel(m.createdAt)}</span></div>}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`px-2.5 py-1.5 rounded-lg max-w-[72%] shadow-sm ${mine ? "bg-emerald-600/25 border border-emerald-500/20" : "bg-white/[0.05] border border-line"}`}>
                          {!mine && m.authorName && <div className="text-[11px] text-gold2 font-medium mb-0.5">{m.authorName}</div>}
                          {m.replyTo?.text && <div className="mb-1 border-l-2 border-gold/50 pl-2 text-[11px] text-cream/50 truncate">{m.replyTo.authorName}: {m.replyTo.text}</div>}
                          {m.image && (m.image.startsWith("data:application/pdf")
                            ? <a href={m.image} download={m.fileName || "file.pdf"} className="inline-flex items-center gap-1 underline text-xs text-gold">📄 {m.fileName || "document.pdf"}</a>
                            : <img src={m.image} alt={m.fileName || ""} className="max-h-52 rounded-md" />)}
                          {m.text && <div className="whitespace-pre-wrap break-words text-sm text-cream/90">{m.text}</div>}
                          <div className={`flex items-center gap-1 justify-end text-[10px] mt-0.5 ${mine ? "text-emerald-300/70" : "text-cream/35"}`}>
                            {timeShort(m.createdAt)}
                            {mine && <CheckCheck size={12} className="text-emerald-300/80" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!msgs.length && <div className="text-cream/45 text-sm text-center mt-6">No messages yet. Say hello.</div>}
              </div>

              <div className="flex items-end gap-2 p-2.5 border-t border-line bg-ink">
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={sendFile} />
                <button className="btn-ghost h-11 w-11 shrink-0 !px-0 grid place-items-center" onClick={() => fileRef.current?.click()} title="Attach"><Paperclip size={17} /></button>
                <textarea value={text} onChange={e => onType(e.target.value)} onKeyDown={onKey} rows={1}
                  placeholder="Type a message…  (Enter to send, Shift+Enter new line)" className="flex-1 resize-none max-h-32" />
                <button className="btn h-11 w-12 shrink-0 !px-0 grid place-items-center" onClick={send}><Send size={16} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

function dayKey(d) { return new Date(d).toDateString(); }
function dayLabel(d) {
  const dt = new Date(d); const today = new Date(); const y = new Date(Date.now() - 86400000);
  if (dt.toDateString() === today.toDateString()) return "Today";
  if (dt.toDateString() === y.toDateString()) return "Yesterday";
  return dt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
function timeShort(d) { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
