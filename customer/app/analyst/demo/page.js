"use client";
import { useState } from "react";
import Link from "next/link";

const SCENARIOS = [
  { title: "Standard Product", brand: "Zara", name: "Dress", original: 400, buying: 395.2, sale: 400, profitPct: 1.2, latest: false,
    tip: "Beginner level, normal collection. Low %, consistent." },
  { title: "Latest Collection", brand: "Gucci", name: "Handbag", original: 1800, buying: 1386, sale: 1800, profitPct: 23, latest: true,
    tip: "Latest-collection product. Much higher return." },
  { title: "Mid-Level Account", brand: "Dior", name: "Watch", original: 1200, buying: 1176, sale: 1200, profitPct: 2, latest: false,
    tip: "Silver level (deposit ≥ $1000). Higher daily salary + 2% normal." },
  { title: "Negative Window", brand: "Prada", name: "Jacket", original: 900, buying: 918, sale: 900, profitPct: -2, latest: false,
    tip: "Backend may override profit. Treat as risk-management event; continue cycle." },
];

export default function Demo() {
  const [i, setI] = useState(0);
  const s = SCENARIOS[i];
  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
        <Link href="/dashboard" className="font-display text-xl text-gold">← Shein</Link>
        <span className="text-cream/60 text-sm">Demo Account · Scenario {i+1}/4</span>
      </header>
      <section className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl text-gold">{s.title}</h1>
        <p className="text-cream/70 mt-2">{s.tip}</p>
        <div className="card p-6 mt-6 grid grid-cols-2 gap-3">
          <L label="Brand" v={s.brand} />
          <L label="Product" v={s.name} />
          <L label="Original" v={`$${s.original}`} />
          <L label="Buying Rate" v={`$${s.buying}`} g />
          <L label="Sale" v={`$${s.sale}`} />
          <L label="Profit %" v={`${s.profitPct}%`} g />
        </div>
        <div className="flex justify-between mt-6">
          <button disabled={i===0} onClick={() => setI(i-1)} className="px-5 py-3 rounded-full border border-gold/30 disabled:opacity-30">PREV</button>
          <button disabled={i===SCENARIOS.length-1} onClick={() => setI(i+1)} className="btn-gold">NEXT</button>
        </div>
      </section>
    </main>
  );
}

function L({ label, v, g }) {
  return (
    <div className={`p-3 rounded-lg bg-black/30 border ${g ? "border-gold/40" : "border-white/5"}`}>
      <div className="text-[10px] tracking-widest text-cream/50">{label}</div>
      <div className="text-base">{v}</div>
    </div>
  );
}
