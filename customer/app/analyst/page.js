"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";

export default function AnalystPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, refresh } = useMe();
  const [next, setNext] = useState(null);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("work");
  const [history, setHistory] = useState([]);

  async function loadNext() { setNext(await api("/api/analyst/next")); }
  useEffect(() => { loadNext().catch(e => setErr(e.message)); }, []);
  useEffect(() => { if (tab === "history") api("/api/analyst/history").then(d => setHistory(d.items)); }, [tab]);

  async function submit() {
    setErr(""); setBusy(true);
    try { await api("/api/analyst/submit", { method: "POST", body: { comment } }); setComment(""); await Promise.all([loadNext(), refresh()]); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-gold">Product Analyst</h1>
          <p className="text-sm text-cream/55">Cycle progress {me.analyst?.cycleCount ?? 0}/27</p>
        </div>
        <Link href="/analyst/demo" className="btn-outline py-2 px-4 text-sm">Demo Account</Link>
      </div>

      <LevelBar balance={me.balance} />

      <div className="flex gap-4 mt-6 border-b border-gold/10">
        <Tab active={tab === "work"} onClick={() => setTab("work")}>Analyst</Tab>
        <Tab active={tab === "history"} onClick={() => setTab("history")}>History</Tab>
      </div>

      {tab === "work" && (
        <div className="mt-6">
          {!next ? <div className="card p-8 text-center text-cream/60">Loading…</div>
            : next.done ? (
              <div className="card p-8 text-center">
                <h3 className="font-display text-2xl text-gold">Cycle Complete</h3>
                <p className="text-cream/70 mt-2">You analyzed all {next.cycleCount} products this cycle. Contact support to reset.</p>
              </div>
            ) : <ProductCard next={next} comment={comment} setComment={setComment} onSubmit={submit} busy={busy} err={err} />}
        </div>
      )}
      {tab === "history" && <History items={history} />}
    </div>
  );
}

const LADDER = [
  { key: "beginner", name: "Beginner", min: 0 },
  { key: "silver", name: "Silver", min: 1000 },
  { key: "gold", name: "Gold", min: 2000 },
];
function LevelBar({ balance = 0 }) {
  let cur = LADDER[0];
  for (const l of LADDER) if (balance >= l.min) cur = l;
  const next = LADDER[LADDER.indexOf(cur) + 1];
  const pct = next ? Math.min(100, Math.round((balance / next.min) * 100)) : 100;
  return (
    <div className="card p-4 mt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gold font-semibold">{cur.name} level</span>
        <span className="text-cream/60">{next ? `$${balance.toFixed(0)} / $${next.min} to ${next.name}` : "Top level reached"}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-black/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-gold2" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
function Tab({ active, onClick, children }) {
  return <button onClick={onClick} className={`px-4 py-2 border-b-2 transition ${active ? "border-gold text-gold" : "border-transparent text-cream/60 hover:text-cream"}`}>{children}</button>;
}

function ProductCard({ next, comment, setComment, onSubmit, busy, err }) {
  const p = next.product, q = next.quote;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 fadein">
        <div className="aspect-square bg-ink2 rounded-xl overflow-hidden">
          {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div><div className="label">Brand</div><div className="font-display text-2xl text-gold">{p.brand}</div></div>
          {p.isLatest && <span className="chip gold-grad text-white border-none font-semibold">LATEST</span>}
        </div>
        <div className="mt-2"><div className="label">Product</div><div className="text-xl">{p.name}</div></div>
      </div>

      <div className="card p-6 flex flex-col fadein-2">
        <div className="grid grid-cols-2 gap-3">
          <Line label="Original Price" value={`$${p.originalPrice}`} />
          <Line label="Buying Rate" value={`$${q.buyingRate}`} highlight />
          <Line label="Sale Price" value={`$${q.salePrice}`} />
          <Line label="Profit %" value={`${q.profitPct}%`} highlight />
          <Line label="Dividends" value={`$${q.profitAmount}`} big />
          <Line label="Progress" value={`${next.cycleIndex}/27`} />
        </div>
        <label className="block mt-4">
          <span className="label mb-1 block">Comment (required)</span>
          <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} className="field" />
        </label>
        {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
        <button className="btn-gold mt-4" onClick={onSubmit} disabled={busy || !comment.trim()}>{busy ? "SUBMITTING…" : "BUY & SUBMIT"}</button>
      </div>
    </div>
  );
}

function Line({ label, value, highlight, big }) {
  return (
    <div className={`p-3 rounded-lg bg-ink2 border ${highlight ? "border-gold/40" : "border-line"}`}>
      <div className="label">{label}</div>
      <div className={big ? "text-2xl text-gold font-semibold" : "text-base"}>{value}</div>
    </div>
  );
}

function History({ items }) {
  if (!items.length) return <div className="mt-6 card p-6 text-cream/60">No submissions yet.</div>;
  return (
    <div className="mt-6 card divide-y divide-black/[0.06]">
      {items.map(it => (
        <div key={it._id} className="p-4 flex items-center justify-between">
          <div>
            <div className="text-gold font-display">{it.product?.brand} · {it.product?.name}</div>
            <div className="text-xs text-cream/50">{new Date(it.createdAt).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-cream">+${it.profitAmount}</div>
            <div className="text-xs text-cream/50">{it.profitPct}% · {it.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
