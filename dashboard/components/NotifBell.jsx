"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Bell, Trash2, BellOff } from "lucide-react";

const ICON = { deposit: "💰", withdrawal: "🏦", support: "💬", community: "👥", mentor: "🎓", analyst: "📈", combo: "⭐", verification: "🪪", signup: "✨", login: "🔑", invest: "📊" };
const ROUTE = { deposit: "/tx", withdrawal: "/tx", support: "/support", community: "/community", mentor: "/my-juniors", invest: "/tx" };

export default function NotifBell() {
  const r = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("feed"); // feed | mutes
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [cfg, setCfg] = useState({ types: [], mutes: {} });
  const ref = useRef(null);

  async function loadCount() { try { const d = await api("/api/admin/notifications?limit=1"); setUnread(d.unread || 0); } catch {} }
  async function loadFeed() { try { const d = await api("/api/admin/notifications?limit=60"); setItems(d.items || []); setUnread(d.unread || 0); } catch {} }
  async function loadCfg() { try { setCfg(await api("/api/admin/notif-config")); } catch {} }

  useEffect(() => { loadCount(); loadCfg(); const t = setInterval(loadCount, 15000); return () => clearInterval(t); }, []);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function toggleOpen() {
    const n = !open; setOpen(n);
    if (n) { await loadFeed(); if (unread) { api("/api/admin/notifications/read", { method: "POST", body: { all: true } }).catch(() => {}); setUnread(0); } }
  }
  function go(it) {
    setOpen(false);
    const meta = it.meta || {};
    // Talking-related notifications jump straight to the right room/thread.
    if (it.type === "community") {
      const g = String(meta.group || "");
      const member = g.startsWith("mentor:") ? g.split(":")[2] : (g.split(":")[1] || it.user || "");
      const qs = new URLSearchParams();
      if (g) qs.set("group", g);
      if (member) qs.set("member", member);
      r.push(`/community${qs.toString() ? "?" + qs : ""}`);
      return;
    }
    if (it.type === "mentor") {
      const g = String(meta.group || "");
      const mentee = g.startsWith("mentor:") ? g.split(":")[2] : (it.user || "");
      r.push(mentee ? `/my-juniors?mentee=${mentee}` : "/my-juniors");
      return;
    }
    if (it.type === "support") { r.push(it.user ? `/support?user=${it.user}` : "/support"); return; }
    r.push(ROUTE[it.type] || "/users");
  }
  async function clearRead() { await api("/api/admin/notifications", { method: "DELETE" }).catch(() => {}); await loadFeed(); }
  async function toggleMute(type) {
    const cur = !!cfg.mutes[type];
    await api(`/api/admin/settings/muteNotif_${type}`, { method: "PUT", body: { value: !cur } }).catch(() => {});
    setCfg(c => ({ ...c, mutes: { ...c.mutes, [type]: !cur } }));
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggleOpen} className="relative grid h-9 w-9 place-items-center rounded-lg hover:bg-black/[0.04] text-cream/80">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 text-white text-[10px] px-1">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-gold/20 bg-ink shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-line">
            <div className="flex gap-3 text-sm">
              <button className={tab === "feed" ? "text-gold" : "text-cream/50"} onClick={() => setTab("feed")}>Activity</button>
              <button className={tab === "mutes" ? "text-gold" : "text-cream/50"} onClick={() => { setTab("mutes"); loadCfg(); }}>Mutes</button>
            </div>
            {tab === "feed" && <button onClick={clearRead} className="text-cream/40 hover:text-cream/70" title="Clear read"><Trash2 size={14} /></button>}
          </div>

          {tab === "feed" ? (
            <div className="max-h-96 overflow-y-auto divide-y divide-line">
              {items.map(it => (
                <button key={it._id} onClick={() => go(it)} className={`w-full text-left px-3 py-2.5 hover:bg-black/[0.04] ${it.read ? "" : "bg-gold/[0.06]"}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none">{ICON[it.type] || "🔔"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-cream truncate">{it.title}</div>
                      {it.body && <div className="text-xs text-cream/55 truncate">{it.body}</div>}
                      <div className="text-[10px] text-cream/35 mt-0.5">{new Date(it.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              ))}
              {!items.length && <div className="px-3 py-6 text-center text-cream/40 text-sm">No activity yet.</div>}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto p-2">
              <div className="text-[11px] text-cream/50 px-1 pb-1">Muted types won't create notifications.</div>
              {cfg.types.map(t => (
                <label key={t} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-black/[0.04] text-sm cursor-pointer">
                  <span className="flex items-center gap-2 text-cream/80">{ICON[t] || "🔔"} <span className="capitalize">{t}</span></span>
                  <input type="checkbox" checked={!cfg.mutes[t]} onChange={() => toggleMute(t)} title="on = notify" />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
