"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const DOT = {
  deposit_approved: "bg-emerald-500",
  withdrawal_complete: "bg-rose-500",
  analysis_complete: "bg-gold2",
  invest_start: "bg-blue-500",
  level_up: "bg-amber-500",
  new_member: "bg-cream/40",
};

function text(it) {
  const m = `Member #${it.memberNumber}`;
  switch (it.type) {
    case "deposit_approved": return `${m} deposited $${it.amount}`;
    case "withdrawal_complete": return `${m} withdrew $${it.amount}`;
    case "analysis_complete": return `${m} completed a product analysis cycle`;
    case "invest_start": return `${m} started a Gold tier investment`;
    case "level_up": return `${m} upgraded to Silver level`;
    case "new_member": return "New analyst joined the platform";
    default: return `${m} is active`;
  }
}
function keyOf(it) { return `${it.type}:${it.memberNumber}:${it.at}`; }

export default function ActivityFeed() {
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const seen = useRef(new Set());

  useEffect(() => {
    let alive = true;
    const load = () => api("/api/activity/feed").then(d => {
      if (!alive) return;
      setEnabled(d.enabled !== false);
      setItems(d.items || []);
    }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!enabled || !items.length) return null;

  return (
    <div className="mt-6 card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg text-gold">Live Activity</h3>
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: "16rem" }}>
        {items.map(it => {
          const k = keyOf(it);
          const isNew = !seen.current.has(k);
          seen.current.add(k);
          return (
            <div key={k} className={`flex items-center gap-2.5 py-1.5 ${isNew ? "toast-in" : ""}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[it.type] || "bg-cream/40"}`} />
              <span className="text-sm text-cream/75 flex-1 truncate">{text(it)}</span>
              <span className="text-xs text-cream/40 shrink-0">{it.timeAgo}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
