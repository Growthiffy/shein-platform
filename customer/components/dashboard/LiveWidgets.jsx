"use client";
import { useEffect, useState } from "react";
import { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Clock, TrendingUp } from "lucide-react";

function fmtLeft(ms) {
  if (ms <= 0) return "due now";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export function SalaryCountdown() {
  const { me } = useMe();
  const base = me.lastSalaryAt ? new Date(me.lastSalaryAt).getTime() + 24 * 3600 * 1000 : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!base) return null;
  const left = base - now;
  const pct = Math.max(0, Math.min(100, Math.round((1 - left / (24 * 3600 * 1000)) * 100)));
  return (
    <div className="stat">
      <div className="label flex items-center gap-1"><Clock size={12} /> Next salary credit</div>
      <div className="text-2xl font-semibold text-gold mt-1">{fmtLeft(left)}</div>
      <div className="mt-2 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div className="h-full rounded-full gold-grad" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function InvestmentCard() {
  const [s, setS] = useState(null);
  useEffect(() => { api("/api/invest/summary").then(setS).catch(() => {}); }, []);
  if (!s?.active) return null;
  const next = s.nextPayoutAt ? new Date(s.nextPayoutAt).getTime() : null;
  const left = next ? next - Date.now() : 0;
  const weekPct = next ? Math.max(0, Math.min(100, Math.round((1 - left / (7 * 24 * 3600 * 1000)) * 100))) : 0;
  return (
    <div className="mt-6 card p-5">
      <div className="flex items-center gap-2"><TrendingUp size={18} className="text-gold2" /><h3 className="font-display text-lg text-gold">Active Investment</h3></div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span className="text-cream">{s.tierName} Tier · <b className="text-gold">${s.amount}</b> locked</span>
        <span className="text-cream/70">Weekly return: <b className="text-gold2">${s.weeklyEarn}</b></span>
        {next && <span className="text-cream/70">Next payout in {fmtLeft(left)}</span>}
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
        <div className="h-full rounded-full gold-grad" style={{ width: `${weekPct}%` }} />
      </div>
    </div>
  );
}

export function BalanceChart() {
  const [pts, setPts] = useState(null);
  useEffect(() => { api("/api/me/balance-history").then(d => setPts(d.points || [])).catch(() => {}); }, []);
  if (!pts || pts.length < 2) return null;

  const W = 600, H = 120, P = 6;
  const vals = pts.map(p => p.balance);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const span = max - min || 1;
  const x = i => P + (i / (pts.length - 1)) * (W - 2 * P);
  const y = v => H - P - ((v - min) / span) * (H - 2 * P);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const up = vals[vals.length - 1] >= vals[0];

  return (
    <div className="mt-6 card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-gold">Portfolio growth</h3>
        <span className="text-sm text-cream/60">${vals[vals.length - 1].toFixed(2)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" preserveAspectRatio="none" style={{ height: 120 }}>
        <defs>
          <linearGradient id="bchart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3e6d" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ff3e6d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#bchart)" />
        <path d={line} fill="none" stroke={up ? "#ff3e6d" : "#f87171"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}
