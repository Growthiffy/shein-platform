"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TrendingUp } from "lucide-react";

// Scrolling live-payouts ticker — global social proof that money is moving.
export default function PayoutsTicker() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let on = true;
    const load = () => api("/api/stats/payouts-ticker").then(d => { if (on) setItems(d.items || []); }).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { on = false; clearInterval(t); };
  }, []);
  if (!items.length) return null;
  const loop = [...items, ...items]; // duplicate for a seamless marquee
  return (
    <div className="mt-4 relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05]">
      <div className="flex items-center">
        <div className="flex items-center gap-1.5 shrink-0 px-3 py-2 text-emerald-500 text-xs font-semibold border-r border-emerald-500/20 bg-emerald-500/[0.08]">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex gap-6 whitespace-nowrap py-2 px-4" style={{ animation: "ticker 60s linear infinite", width: "max-content" }}>
            {loop.map((it, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs text-cream/80">
                {it.avatar
                  ? <img src={it.avatar} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-emerald-500/30" loading="lazy" />
                  : <TrendingUp size={12} className="text-emerald-500" />}
                <b className="text-cream">{it.name}</b>
                <span className="text-cream/50">{it.country}</span>
                <span className="text-cream/60">{it.verb}</span>
                <b className="text-emerald-500">${Number(it.amount).toLocaleString("en-US")}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
