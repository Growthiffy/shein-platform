"use client";
import { useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Analyst() {
  const r = useRouter();
  const [me, setMe] = useState(null);
  const [next, setNext] = useState(null);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("work"); // work | history
  const [history, setHistory] = useState([]);

  async function load() {
    const u = await api("/api/me");
    setMe(u.user);
    const n = await api("/api/analyst/next");
    setNext(n);
  }
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    load().catch(e => setErr(e.message));
  }, []);

  async function submit() {
    setErr(""); setBusy(true);
    try {
      await api("/api/analyst/submit", { method: "POST", body: { comment } });
      setComment("");
      await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  useEffect(() => {
    if (tab === "history") api("/api/analyst/history").then(d => setHistory(d.items));
  }, [tab]);

  if (!me || !next) return <div className="min-h-screen bg-ink text-cream flex items-center justify-center">Loading…</div>;

  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gold/10">
        <Link href="/dashboard" className="font-display text-xl text-gold">← Shein</Link>
        <Link href="/analyst/demo" className="px-3 py-1 rounded-full border border-gold/30 text-cream/80 text-sm hover:text-gold">Demo Account</Link>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-8">
        <ProfileCard me={me} onReload={load} />

        <div className="flex gap-4 mt-8 border-b border-gold/10">
          <Tab active={tab === "work"}    onClick={() => setTab("work")}>Analyst</Tab>
          <Tab active={tab === "history"} onClick={() => setTab("history")}>History</Tab>
        </div>

        {tab === "work" && (
          <div className="mt-6">
            {next.done ? (
              <div className="card p-8 text-center">
                <h3 className="font-display text-2xl text-gold">Cycle Complete</h3>
                <p className="text-cream/70 mt-2">You analyzed all {next.cycleCount} products this cycle. Contact support to reset.</p>
              </div>
            ) : (
              <ProductCard next={next} comment={comment} setComment={setComment} onSubmit={submit} busy={busy} err={err} />
            )}
          </div>
        )}

        {tab === "history" && <History items={history} />}
      </section>
    </main>
  );
}

function ProfileCard({ me, onReload }) {
  async function setUsername() {
    const name = prompt("Choose a username (min 3 chars):", me.username || "");
    if (!name) return;
    try { await api("/api/me/username", { method: "POST", body: { username: name.trim() } }); await onReload?.(); }
    catch (e) { alert(e.message); }
  }
  return (
    <div className="card p-6 flex flex-wrap gap-6 items-center justify-between">
      <div>
        <div className="text-xs tracking-widest text-cream/50">USERNAME</div>
        <button onClick={setUsername} className="font-display text-2xl text-gold hover:underline" title="Click to edit">
          @{me.username || "set-username"}
        </button>
      </div>
      <Stat label="Balance" value={`$${me.balance?.toFixed(2) ?? "0.00"}`} />
      <Stat label="Level"   value={me.level?.toUpperCase?.() || "BEGINNER"} />
      <Stat label="Daily Salary" value={`$${me.dailySalary ?? 230}`} />
      <div className="flex gap-2">
        <Link href="/wallet/deposit"    className="btn-gold">DEPOSIT</Link>
        <Link href="/wallet/withdraw"   className="px-5 py-3 rounded-full border border-gold/40 text-cream">WITHDRAW</Link>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs tracking-widest text-cream/50">{label}</div>
      <div className="text-lg text-cream font-semibold">{value}</div>
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 border-b-2 transition ${active ? "border-gold text-gold" : "border-transparent text-cream/60"}`}>
      {children}
    </button>
  );
}

function ProductCard({ next, comment, setComment, onSubmit, busy, err }) {
  const p = next.product;
  const q = next.quote;
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6">
        <div className="aspect-square bg-black/40 rounded-xl overflow-hidden">
          {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-xs tracking-widest text-cream/50">BRAND</div>
            <div className="font-display text-2xl text-gold">{p.brand}</div>
          </div>
          {p.isLatest && <span className="text-xs px-2 py-1 rounded-full gold-grad text-black font-semibold">LATEST</span>}
        </div>
        <div className="mt-2">
          <div className="text-xs tracking-widest text-cream/50">PRODUCT</div>
          <div className="text-xl">{p.name}</div>
        </div>
      </div>

      <div className="card p-6 flex flex-col">
        <div className="grid grid-cols-2 gap-3">
          <Line label="Original Price" value={`$${p.originalPrice}`} />
          <Line label="Buying Rate"    value={`$${q.buyingRate}`} highlight />
          <Line label="Sale Price"     value={`$${q.salePrice}`} />
          <Line label="Profit %"       value={`${q.profitPct}%`} highlight />
          <Line label="Dividends"      value={`$${q.profitAmount}`} big />
          <Line label="Progress"       value={`${next.cycleIndex}/27`} />
        </div>

        <label className="block mt-4">
          <span className="block text-xs tracking-widest text-cream/60 mb-1">COMMENT (required)</span>
          <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
            className="w-full bg-black/40 border border-gold/20 rounded-lg px-3 py-2 text-cream outline-none focus:border-gold" />
        </label>
        {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
        <button className="btn-gold mt-4" onClick={onSubmit} disabled={busy || !comment.trim()}>
          {busy ? "SUBMITTING…" : "BUY & SUBMIT"}
        </button>
      </div>
    </div>
  );
}

function Line({ label, value, highlight, big }) {
  return (
    <div className={`p-3 rounded-lg bg-black/30 border ${highlight ? "border-gold/40" : "border-white/5"}`}>
      <div className="text-[10px] tracking-widest text-cream/50">{label}</div>
      <div className={`${big ? "text-2xl text-gold font-semibold" : "text-base"}`}>{value}</div>
    </div>
  );
}

function History({ items }) {
  if (!items.length) return <div className="mt-6 card p-6 text-cream/60">No submissions yet.</div>;
  return (
    <div className="mt-6 card divide-y divide-white/5">
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
