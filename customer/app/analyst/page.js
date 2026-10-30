"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { CountUp, Confetti, StarRating, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";

export default function AnalystPage() { return <AppShell><Body /></AppShell>; }

const MIN_COMMENT = 50;
const RECS = [
  { v: "stock_more", label: "Stock More" },
  { v: "maintain", label: "Maintain Current Levels" },
  { v: "reduce", label: "Reduce Inventory" },
  { v: "discontinue", label: "Discontinue" },
];
const CAT_COLORS = {
  fashion: "#ff3e6d", electronics: "#60a5fa", home: "#f6c453",
  beauty: "#c084fc", accessories: "#34d399", sports: "#fb923c",
};

function Body() {
  const { me, refresh } = useMe();
  const toast = useToast();
  const [next, setNext] = useState(null);
  const [form, setForm] = useState({ demand: 0, quality: 0, price: 0, rec: "", comment: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("work");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);   // success modal payload
  const [confetti, setConfetti] = useState(false);
  const [summary, setSummary] = useState(null);

  async function loadNext() { setErr(""); setNext(await api("/api/analyst/next")); }
  useEffect(() => { loadNext().catch(e => setErr(e.message)); }, []);
  useEffect(() => { if (tab === "history") api("/api/analyst/history").then(d => setHistory(d.items)); }, [tab]);

  function resetForm() { setForm({ demand: 0, quality: 0, price: 0, rec: "", comment: "" }); }

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const d = await api("/api/analyst/submit", { method: "POST", body: {
        comment: form.comment,
        demandRating: form.demand, qualityRating: form.quality,
        priceRating: form.price, recommendation: form.rec,
      }});
      resetForm();
      setResult(d);
      toast({ text: `Commission earned: +$${d.commission.toFixed(2)}`, type: "success" });
      await refresh();
      if (d.cycleComplete) {
        setConfetti(true);
        const h = await api("/api/analyst/history").catch(() => ({ items: [] }));
        const cycle = (h.items || []).slice(0, 27);
        setSummary({ total: cycle.reduce((s, it) => s + (it.profitAmount || 0), 0), count: cycle.length });
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  // After the success modal closes, pull the next product (shows cooldown panel).
  async function closeResult() { setResult(null); await loadNext().catch(e => setErr(e.message)); }

  const valid = form.demand && form.quality && form.price && form.rec && form.comment.trim().length >= MIN_COMMENT;

  return (
    <div className="page">
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
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
          {!next ? <LoadingCard />
            : next.done ? <CycleDone cycleCount={next.cycleCount} summary={summary} />
            : next.cooldown ? <Cooldown availableAt={next.availableAt} onReady={loadNext} />
            : <ProductCard next={next} form={form} setForm={setForm} onSubmit={submit} busy={busy} err={err} valid={valid} />}
        </div>
      )}
      {tab === "history" && <History items={history} />}

      {result && <SuccessModal result={result} onClose={closeResult} summary={summary} />}
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

function LoadingCard() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 space-y-4"><Skeleton className="aspect-square w-full" /><Skeleton className="h-6 w-32" /><Skeleton className="h-5 w-24" /></div>
      <div className="card p-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full" />)}</div>
    </div>
  );
}

function CategoryChip({ category }) {
  if (!category) return null;
  const c = CAT_COLORS[category] || "#111";
  return <span className="chip font-semibold" style={{ color: c, borderColor: c + "55", background: c + "14" }}>{category.toUpperCase()}</span>;
}

function ProductCard({ next, form, setForm, onSubmit, busy, err, valid }) {
  const p = next.product, q = next.quote;
  const len = form.comment.trim().length;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 fadein">
        <div className="aspect-square bg-ink2 rounded-xl overflow-hidden">
          {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div><div className="label">Brand</div><div className="font-display text-2xl text-gold">{p.brand}</div></div>
          <div className="flex items-center gap-2">
            <CategoryChip category={p.category} />
            {p.isLatest && <span className="chip gold-grad text-white border-none font-semibold">LATEST</span>}
          </div>
        </div>
        <div className="mt-2"><div className="label">Product</div><div className="text-xl">{p.name}</div></div>
        {p.marketBrief && (
          <div className="mt-4 p-3 rounded-lg bg-ink2 border border-line">
            <div className="label mb-1">Market Brief</div>
            <p className="text-sm text-cream/70 leading-relaxed">{p.marketBrief}</p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Line label="Original Price" value={`$${p.originalPrice}`} />
          <Line label="Buying Rate" value={`$${q.buyingRate}`} highlight />
          <Line label="Sale Price" value={`$${q.salePrice}`} />
          <Line label="Profit %" value={`${q.profitPct}%`} highlight />
          <Line label="Commission" value={`$${q.profitAmount}`} big />
          <Line label="Progress" value={`${next.cycleIndex}/27`} />
        </div>
      </div>

      <div className="card p-6 flex flex-col fadein-2">
        <h3 className="font-display text-xl text-gold mb-4">Analyst Assessment</h3>
        <RatingRow label="Market Demand Assessment" value={form.demand} onChange={v => setForm({ ...form, demand: v })} />
        <RatingRow label="Product Quality Rating" value={form.quality} onChange={v => setForm({ ...form, quality: v })} />
        <RatingRow label="Price Competitiveness" value={form.price} onChange={v => setForm({ ...form, price: v })} />

        <label className="block mt-4">
          <span className="label mb-1 block">Recommended Action</span>
          <select value={form.rec} onChange={e => setForm({ ...form, rec: e.target.value })} className="field">
            <option value="">Select an action…</option>
            {RECS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
        </label>

        <label className="block mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="label">Detailed Analysis</span>
            <span className={`text-xs ${len >= MIN_COMMENT ? "text-emerald-500" : "text-cream/45"}`}>{len}/{MIN_COMMENT} minimum</span>
          </div>
          <textarea rows={4} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} className="field"
            placeholder="Observations on market positioning, demand trends, pricing strategy…" />
        </label>

        {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
        <button className="btn-gold mt-4" onClick={onSubmit} disabled={busy || !valid}>
          {busy ? "SUBMITTING…" : "BUY & SUBMIT ANALYSIS"}
        </button>
      </div>
    </div>
  );
}

function RatingRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-line last:border-0">
      <span className="text-sm text-cream/75">{label}</span>
      <StarRating value={value} onChange={onChange} size={22} />
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

function Cooldown({ availableAt, onReady }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((availableAt - Date.now()) / 1000)));
  const firedRef = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0 && !firedRef.current) { firedRef.current = true; clearInterval(t); onReady(); }
    }, 300);
    return () => clearInterval(t);
  }, [availableAt, onReady]);
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
  return (
    <div className="card p-10 text-center fadein">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      <h3 className="font-display text-2xl text-gold">Preparing next product analysis…</h3>
      <p className="text-cream/60 mt-2">Our system is sourcing the next product for you.</p>
      <div className="mt-4 font-display text-4xl text-cream">{mm}:{ss}</div>
    </div>
  );
}

function CycleDone({ cycleCount, summary }) {
  return (
    <div className="card p-8 text-center fadein">
      <h3 className="font-display text-2xl text-gold">Cycle Complete</h3>
      <p className="text-cream/70 mt-2">You analyzed all {cycleCount} products this cycle.</p>
      {summary && <p className="text-cream mt-3 text-lg">Total commission earned this cycle: <span className="text-gold font-semibold">${summary.total.toFixed(2)}</span></p>}
      <p className="text-cream/50 text-sm mt-3">Contact support to reset your cycle.</p>
    </div>
  );
}

function SuccessModal({ result, onClose, summary }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 px-4" onClick={onClose}>
      <div className="card p-7 max-w-sm w-full text-center pop-in" onClick={e => e.stopPropagation()}>
        {result.cycleComplete ? (
          <>
            <h3 className="font-display text-2xl text-gold">Cycle Complete! 🎉</h3>
            {summary && <p className="text-cream/70 mt-2">Total commission this cycle</p>}
            {summary && <div className="font-display text-4xl text-gold mt-1"><CountUp value={summary.total} prefix="$" /></div>}
          </>
        ) : (
          <>
            <div className="label">Analysis Quality Score</div>
            <div className="font-display text-5xl text-gold mt-1">{result.qualityScore}%</div>
            <div className="mt-5 text-cream/70">Commission earned</div>
            <div className="font-display text-3xl text-emerald-500 mt-1">+<CountUp value={result.commission} prefix="$" /></div>
            <NextTimer availableAt={result.availableAt} />
          </>
        )}
        <button className="btn-gold w-full mt-6" onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}

function NextTimer({ availableAt }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((availableAt - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((availableAt - Date.now()) / 1000))), 300);
    return () => clearInterval(t);
  }, [availableAt]);
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
  return <div className="text-sm text-cream/55 mt-5">Next product available in {mm}:{ss}</div>;
}

function History({ items }) {
  if (!items.length) return <div className="mt-6 card p-6 text-cream/60">No submissions yet.</div>;
  return (
    <div className="mt-6 card divide-y divide-black/[0.06]">
      {items.map(it => (
        <div key={it._id} className="p-4 flex items-center justify-between">
          <div>
            <div className="text-gold font-display">{it.product?.brand} · {it.product?.name}</div>
            <div className="text-xs text-cream/50">{new Date(it.createdAt).toLocaleString()}{it.qualityScore ? ` · score ${it.qualityScore}%` : ""}</div>
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
