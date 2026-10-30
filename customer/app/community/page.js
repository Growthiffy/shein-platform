"use client";
import { useEffect, useRef, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Send, Trash2, Reply, X, SmilePlus } from "lucide-react";

const GROUPS = [{ id: "daily", label: "Daily Analysts" }, { id: "invest", label: "Investors" }];

const EMOJI = { fire: "🔥", thumbsup: "👍", heart: "❤️", clap: "👏", rocket: "🚀", eyes: "👀", "100": "💯" };
const QUICK = ["fire", "thumbsup", "heart", "clap", "rocket"];
function jitter(n) { return Math.max(0, Math.round(n + (Math.random() * 20 - 10))); }

export default function CommunityPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me } = useMe();
  const access = me.communityAccess || { daily: true, invest: true };
  const visible = GROUPS.filter(g => access[g.id] !== false);
  const [group, setGroup] = useState(visible[0]?.id || "daily");
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [typing, setTyping] = useState([]);
  const [online, setOnline] = useState({});
  const [picker, setPicker] = useState(null); // messageId with open reaction picker
  const box = useRef(null);
  const inputRef = useRef(null);

  async function load(g, scroll = true) {
    try {
      const d = await api(`/api/community/${g}`); setItems(d.items); setTyping(d.typing || []); setBlocked(false);
      if (scroll) setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
    } catch (e) { if (String(e.message).includes("access")) { setBlocked(true); setItems([]); } }
  }
  useEffect(() => {
    setReplyTo(null); load(group);
    const t = setInterval(() => load(group, false), 6000);
    return () => clearInterval(t);
  }, [group]);

  // Per-group online counts derived from the public online total (60% daily / 40% invest).
  useEffect(() => {
    api("/api/stats/public").then(d => {
      const n = d.onlineMembers || 0;
      setOnline({ daily: jitter(n * 0.6), invest: jitter(n * 0.4) });
    }).catch(() => {});
  }, []);

  async function react(messageId, emoji) {
    setPicker(null);
    setItems(list => list.map(m => m._id === messageId ? { ...m, reactions: toggleLocal(m.reactions, emoji, me.id) } : m));
    try { await api(`/api/community/${group}/react/${messageId}`, { method: "POST", body: { emoji } }); }
    catch { load(group, false); }
  }

  async function send() {
    const t = text.replace(/\r\n/g, "\n");
    if (!t.trim()) return;
    try {
      await api(`/api/community/${group}`, { method: "POST", body: { text: t, replyTo: replyTo?._id } });
      setText(""); setReplyTo(null); await load(group);
    } catch {}
  }
  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }
  async function del(id) { try { await api(`/api/community/message/${id}`, { method: "DELETE" }); await load(group, false); } catch {} }
  function startReply(m) { setReplyTo(m); inputRef.current?.focus(); }
  function mention(name) { setText(t => (t ? t.replace(/\s*$/, " ") : "") + "@" + name + " "); inputRef.current?.focus(); }
  function goto(id) { document.getElementById("msg-" + id)?.scrollIntoView({ behavior: "smooth", block: "center" }); }

  return (
    <div className="page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl text-gold">Community</h1>
        <div className="flex gap-2">
          {visible.map(g => (
            <button key={g.id} onClick={() => setGroup(g.id)}
              className={`px-4 py-1.5 rounded-full text-sm transition ${g.id === group ? "bg-gold2 text-white font-semibold" : "border border-line text-cream/70 hover:text-cream"}`}>
              {g.label}
              {online[g.id] != null && <span className={`ml-2 text-xs ${g.id === group ? "text-white/80" : "text-emerald-500"}`}>● {online[g.id]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div ref={box} className="card mt-5 h-[62vh] overflow-y-auto p-3 md:p-4 space-y-2.5">
        {items.map(m => {
          const mine = m.authorType === "user" && m.user && String(m.user) === String(me.id);
          const staff = m.authorType === "staff" || m.authorType === "ai" || m.authorType === "persona";
          return (
            <div key={m._id} id={"msg-" + m._id} className="group flex gap-2.5 scroll-mt-20">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gold2/15 grid place-items-center font-display text-gold2 overflow-hidden">
                {m.authorAvatar ? <img src={m.authorAvatar} alt="" className="h-full w-full object-cover" /> : (m.authorName || "?")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => mention(m.authorName)} className="text-cream/70 font-medium hover:text-gold2">{m.authorName || "member"}</button>
                  {staff && <span className="text-gold2">• staff</span>}
                  <span className="text-cream/30">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <div className="relative">
                      <button onClick={() => setPicker(picker === m._id ? null : m._id)} className="text-cream/40 hover:text-gold2" title="React"><SmilePlus size={13} /></button>
                      {picker === m._id && (
                        <div className="absolute right-0 top-5 z-10 flex gap-1 rounded-full border border-line bg-ink px-2 py-1 shadow-lg">
                          {QUICK.map(e => <button key={e} onClick={() => react(m._id, e)} className="text-base hover:scale-125 transition">{EMOJI[e]}</button>)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => startReply(m)} className="text-cream/40 hover:text-gold2" title="Reply"><Reply size={13} /></button>
                    {mine && <button onClick={() => del(m._id)} className="text-cream/40 hover:text-gold2" title="Delete"><Trash2 size={12} /></button>}
                  </span>
                </div>
                {m.replyTo?.text && (
                  <button onClick={() => goto(m.replyTo.id)} className="mt-1 block max-w-full text-left border-l-2 border-gold2/60 bg-gold2/5 rounded-r px-2 py-1">
                    <div className="text-[11px] text-gold2 font-medium">{m.replyTo.authorName}</div>
                    <div className="text-[11px] text-cream/50 truncate">{m.replyTo.text}</div>
                  </button>
                )}
                <MsgText text={m.text} />
                {!!(m.reactions && m.reactions.length) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.reactions.map(r => {
                      const mineR = (r.users || []).some(u => String(u) === String(me.id));
                      return (
                        <button key={r.emoji} onClick={() => react(m._id, r.emoji)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${mineR ? "border-gold2 bg-gold2/10" : "border-line hover:border-gold2/40"}`}>
                          <span>{EMOJI[r.emoji] || "⭐"}</span><span className="text-cream/60">{r.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {blocked && <div className="text-cream/50 text-sm">You do not have access to this group.</div>}
        {!blocked && !items.length && <div className="text-cream/50 text-sm">No messages yet.</div>}
        {!blocked && typing.length > 0 && (
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

      {replyTo && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-ink2 px-3 py-2">
          <Reply size={14} className="text-gold2 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-gold2 font-medium">Replying to {replyTo.authorName}</div>
            <div className="text-[11px] text-cream/50 truncate">{replyTo.text}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-cream/40 hover:text-cream shrink-0"><X size={15} /></button>
        </div>
      )}

      <div className="flex items-end gap-2 mt-2">
        <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={1} disabled={blocked}
          placeholder="Write a message…  (Enter to send, Shift+Enter new line, @ to tag)"
          className="field flex-1 resize-none max-h-32 disabled:opacity-40" />
        <button className="btn-gold h-11 w-12 shrink-0 !px-0" onClick={send} disabled={blocked}><Send size={16} /></button>
      </div>
    </div>
  );
}

// Optimistically toggle my reaction locally before the server confirms.
function toggleLocal(reactions = [], emoji, meId) {
  const list = reactions.map(r => ({ ...r, users: [...(r.users || [])] }));
  let r = list.find(x => x.emoji === emoji);
  if (!r) { list.push({ emoji, count: 1, users: [meId] }); return list; }
  const i = r.users.findIndex(u => String(u) === String(meId));
  if (i >= 0) { r.users.splice(i, 1); r.count = Math.max(0, r.count - 1); }
  else { r.users.push(meId); r.count += 1; }
  return list.filter(x => x.count > 0);
}

// Render text with @mentions highlighted and bare URLs linked.
function MsgText({ text }) {
  const parts = String(text).split(/(@[A-Za-z0-9._-]{2,30}|https?:\/\/[^\s]+)/g);
  return (
    <div className="text-cream whitespace-pre-wrap break-words leading-snug">
      {parts.map((p, i) => {
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="underline text-gold2">{p}</a>;
        if (/^@[A-Za-z0-9._-]{2,30}$/.test(p)) return <span key={i} className="text-gold2 font-medium">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </div>
  );
}
