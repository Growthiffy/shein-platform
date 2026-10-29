"use client";
import { useEffect, useRef, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

export default function MentorPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, refresh } = useMe();
  const [list, setList] = useState([]);
  const [picked, setPicked] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const box = useRef(null);

  async function load() {
    const d = await api("/api/mentor"); setList(d.items);
    if (me.mentor) {
      const m = d.items.find(x => String(x._id) === String(me.mentor));
      setPicked(m || null);
      if (m) loadChat(m._id);
    }
  }
  async function loadChat(mentorId) {
    const d = await api(`/api/community/mentor:${mentorId}`);
    setMsgs(d.items);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => { load(); }, []);

  async function choose(id) {
    try { const d = await api("/api/mentor/select", { method: "POST", body: { id } }); setPicked(d.mentor); loadChat(d.mentor._id); await refresh(); }
    catch (e) { alert(e.message); }
  }
  async function send() {
    if (!text.trim() || !picked) return;
    await api(`/api/community/mentor:${picked._id}`, { method: "POST", body: { text } });
    setText(""); loadChat(picked._id);
  }

  return (
    <div className="page">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Mentor</h1>
      <p className="text-cream/60">Pick a personal guide. One-time choice — contact support to change.</p>

      {!picked && (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {list.map(m => (
            <div key={m._id} className="card card-hover p-6">
              <h3 className="font-display text-2xl text-gold">{m.name}</h3>
              <div className="text-cream/60 text-sm">{m.title}</div>
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
            <h3 className="font-display text-2xl text-gold">{picked.name}</h3>
            <div className="text-cream/60 text-sm">{picked.title}</div>
            <p className="mt-2 text-cream/80 text-sm">{picked.bio}</p>
            <div className="mt-3 text-xs text-cream/50">To change mentor, contact support.</div>
          </div>
          <div className="card p-4 md:col-span-2">
            <div ref={box} className="h-[55vh] overflow-y-auto space-y-3 pr-1">
              {msgs.map(m => (
                <div key={m._id} className={`flex ${m.authorType === "user" ? "justify-end" : ""}`}>
                  <div className={`px-3 py-2 rounded-xl max-w-[75%] ${m.authorType === "user" ? "gold-grad text-white" : "bg-black/[0.04] border border-gold/15"}`}>
                    <div className={`text-xs mb-1 ${m.authorType === "user" ? "text-white/50" : "text-cream/50"}`}>{m.authorName || (m.authorType === "user" ? "you" : picked.name)}</div>
                    <div>{m.text}</div>
                  </div>
                </div>
              ))}
              {!msgs.length && <div className="text-cream/50 text-sm">Say hello to your mentor.</div>}
            </div>
            <div className="flex gap-2 mt-3">
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Message your mentor…" className="field rounded-full flex-1" />
              <button className="btn-gold" onClick={send}><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
