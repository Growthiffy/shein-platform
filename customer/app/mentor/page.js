"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function MentorPage() {
  const r = useRouter();
  const [me, setMe] = useState(null);
  const [list, setList] = useState([]);
  const [picked, setPicked] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const box = useRef(null);

  async function load() {
    const u = await api("/api/me"); setMe(u.user);
    const d = await api("/api/mentor"); setList(d.items);
    if (u.user.mentor) {
      const m = d.items.find(x => String(x._id) === String(u.user.mentor));
      setPicked(m || null);
      if (m) loadChat(m._id);
    }
  }
  async function loadChat(mentorId) {
    const d = await api(`/api/community/mentor:${mentorId}`);
    setMsgs(d.items);
    setTimeout(() => box.current?.scrollTo(0, box.current.scrollHeight), 50);
  }
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    load();
  }, []);

  async function choose(id) {
    try { const d = await api("/api/mentor/select", { method: "POST", body: { id } }); setPicked(d.mentor); loadChat(d.mentor._id); await load(); }
    catch (e) { alert(e.message); }
  }
  async function send() {
    if (!text.trim() || !picked) return;
    await api(`/api/community/mentor:${picked._id}`, { method: "POST", body: { text } });
    setText(""); loadChat(picked._id);
  }

  if (!me) return <div className="min-h-screen flex items-center justify-center bg-ink text-cream">Loading…</div>;

  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="px-6 py-4 border-b border-gold/10"><Link href="/dashboard" className="font-display text-xl text-gold">← Shein</Link></header>
      <section className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-display text-4xl text-gold">Mentor</h1>
        <p className="text-cream/70">Pick a personal guide. One-time choice — contact support to change.</p>

        {!picked && (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {list.map(m => (
              <div key={m._id} className="card p-6">
                <h3 className="font-display text-2xl text-gold">{m.name}</h3>
                <div className="text-cream/60 text-sm">{m.title}</div>
                <p className="mt-2 text-cream/80 text-sm">{m.bio}</p>
                <button className="btn-gold mt-4" onClick={() => choose(m._id)}>CHOOSE</button>
              </div>
            ))}
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
                    <div className={`px-3 py-2 rounded-xl max-w-[75%] ${m.authorType === "user" ? "bg-gold/20 text-cream" : "bg-black/40 border border-gold/20"}`}>
                      <div className="text-xs text-cream/50 mb-1">{m.authorName || (m.authorType === "user" ? "you" : picked.name)}</div>
                      <div>{m.text}</div>
                    </div>
                  </div>
                ))}
                {!msgs.length && <div className="text-cream/50 text-sm">Say hello to your mentor.</div>}
              </div>
              <div className="flex gap-2 mt-3">
                <input value={text} onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="Message your mentor…"
                  className="flex-1 bg-black/40 border border-gold/20 rounded-full px-4 py-3 outline-none focus:border-gold" />
                <button className="btn-gold" onClick={send}>SEND</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
