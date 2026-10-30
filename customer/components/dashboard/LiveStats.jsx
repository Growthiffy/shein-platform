"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function fmt(n) { return (n || 0).toLocaleString("en-US"); }

export default function LiveStats() {
  const [s, setS] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => api("/api/stats/public").then(d => { if (alive) setS(d); }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!s) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-cream/60">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <b className="text-cream">{fmt(s.onlineMembers)}</b> analysts online
      </span>
      <span>Total analysts: <b className="text-cream">{fmt(s.totalAnalysts)}</b></span>
      <span>Total payouts: <b className="text-cream">${fmt(s.totalPayouts)}</b></span>
    </div>
  );
}
