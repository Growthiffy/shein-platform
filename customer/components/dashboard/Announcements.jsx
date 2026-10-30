"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Megaphone, X, ChevronDown } from "lucide-react";

const TYPE_STYLE = {
  news: "bg-blue-500/15 text-blue-600",
  update: "bg-emerald-500/15 text-emerald-600",
  maintenance: "bg-amber-500/15 text-amber-700",
  promotion: "bg-gold2/15 text-gold2",
};

let cache = null; // share one fetch between banner + section within a mount
function useAnnouncements() {
  const [items, setItems] = useState(cache);
  useEffect(() => {
    if (cache) return;
    api("/api/announcements").then(d => { cache = d.items || []; setItems(cache); }).catch(() => setItems([]));
  }, []);
  return items;
}

export function AnnouncementBanner() {
  const items = useAnnouncements();
  const [dismissed, setDismissed] = useState(false);
  const pinned = (items || []).find(a => a.pinned);
  useEffect(() => {
    if (!pinned) return;
    try { setDismissed(sessionStorage.getItem("shein_ann_" + pinned._id) === "1"); } catch {}
  }, [pinned?._id]);
  if (!pinned || dismissed) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-gold2/30 bg-gold2/5 p-3 fadein">
      <Megaphone size={18} className="text-gold2 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-cream">{pinned.title}</div>
        {pinned.body && <div className="text-sm text-cream/65 mt-0.5">{pinned.body}</div>}
      </div>
      <button onClick={() => { try { sessionStorage.setItem("shein_ann_" + pinned._id, "1"); } catch {} setDismissed(true); }}
        className="text-cream/40 hover:text-cream shrink-0"><X size={16} /></button>
    </div>
  );
}

export function AnnouncementsSection() {
  const items = useAnnouncements();
  const [open, setOpen] = useState(null);
  const list = (items || []).slice(0, 5);
  if (!list.length) return null;
  return (
    <div className="mt-6 card p-4">
      <h3 className="font-display text-lg text-gold mb-2">Announcements</h3>
      <div className="divide-y divide-black/[0.06]">
        {list.map(a => (
          <div key={a._id} className="py-2.5">
            <button onClick={() => setOpen(open === a._id ? null : a._id)} className="w-full flex items-center gap-2 text-left">
              <span className={`chip ${TYPE_STYLE[a.type] || ""}`}>{a.type}</span>
              <span className="text-sm text-cream flex-1">{a.title}</span>
              <span className="text-xs text-cream/40">{new Date(a.publishedAt).toLocaleDateString()}</span>
              <ChevronDown size={15} className={`text-cream/40 transition ${open === a._id ? "rotate-180" : ""}`} />
            </button>
            {open === a._id && a.body && <p className="text-sm text-cream/65 mt-2 leading-relaxed">{a.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
