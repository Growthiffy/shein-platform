"use client";
import { useEffect, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { EmptyState, ShareProof } from "@/components/ui";
import { TrendingUp } from "lucide-react";

export default function InvestPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, refresh } = useMe();
  const [tiers, setTiers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [amount, setAmount] = useState("");
  const [tier, setTier] = useState(1);
  const [lockWeeks, setLockWeeks] = useState(4);
  const [err, setErr] = useState("");
  const toast = useToast();

  async function loadAll() {
    const [s, h] = await Promise.all([
      api("/api/invest/summary").catch(() => ({ active: false })),
      api("/api/wallet/history").catch(() => ({ items: [] })),
    ]);
    setSummary(s);
    setHistory(h.items.filter(x => ["invest_lock", "invest_payout", "invest_release"].includes(x.type)));
  }
  useEffect(() => {
    api("/api/invest/tiers").then(d => { setTiers(d.tiers); if (d.lockWeeks != null) setLockWeeks(d.lockWeeks); });
    loadAll();
  }, []);

  async function start() {
    setErr("");
    try {
      await api("/api/invest/start", { method: "POST", body: { amount: Number(amount), tierLevel: tier } });
      await Promise.all([refresh(), loadAll()]); setAmount("");
      toast({ text: `Investment locked — ${selTier?.name || "tier"}`, type: "success" });
    } catch (e) { setErr(e.message); }
  }
  async function release() {
    setErr("");
    try { await api("/api/invest/release", { method: "POST" }); await Promise.all([refresh(), loadAll()]); }
    catch (e) { setErr(e.message); }
  }

  const active = summary?.active;
  const selTier = tiers.find(t => t.level === tier);
  const projWeekly = selTier && amount ? +(Number(amount) * selTier.weeklyPct / 100).toFixed(2) : 0;

  return (
    <div className="page">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Invest</h1>
      <p className="text-cream/70">Lock funds and earn weekly. Lock duration is set by the admin.</p>

      <div className="mt-6 card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink2">
              <tr className="label">
                <th className="text-left p-3">Level</th><th className="text-left p-3">Membership</th>
                <th className="text-left p-3">Weekly Profit</th><th className="text-left p-3">Min. Amount</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(t => (
                <tr key={t.level} className={`border-t border-line ${active && summary.tier === t.level ? "bg-gold2/5" : ""}`}>
                  <td className="p-3 text-gold font-semibold">{t.level}</td>
                  <td className="p-3">{t.name}{active && summary.tier === t.level && <span className="ml-2 chip">yours</span>}</td>
                  <td className="p-3">{t.weeklyPct}%</td>
                  <td className="p-3">${t.min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          {active ? (
            <>
              <div className="flex items-center gap-2"><TrendingUp size={18} className="text-gold2" /><h3 className="font-display text-2xl text-gold">Active Investment</h3></div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="stat"><div className="label">Principal</div><div className="text-xl font-semibold mt-1">${summary.amount}</div></div>
                <div className="stat"><div className="label">Tier</div><div className="text-xl font-semibold mt-1">{summary.tierName} · {summary.weeklyPct}%/wk</div></div>
                <div className="stat"><div className="label">Weekly Earning</div><div className="text-xl font-semibold text-gold2 mt-1">${summary.weeklyEarn}</div></div>
                <div className="stat"><div className="label">Total Paid Out</div><div className="text-xl font-semibold mt-1">${summary.totalPaid}</div></div>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                <Row k="Weeks active" v={summary.weeksElapsed} />
                <Row k="Next payout" v={new Date(summary.nextPayoutAt).toLocaleDateString()} />
                <Row k="Lock until" v={summary.lockUntil ? new Date(summary.lockUntil).toLocaleDateString() : "—"} />
                <Row k="Status" v={summary.unlocked ? "Unlocked" : "Locked"} />
              </div>
              {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
              <ShareProof kind="invest" group="invest" />
              <button className="btn-gold mt-4 w-full disabled:opacity-40" onClick={release} disabled={!summary.unlocked}>
                {summary.unlocked ? "RELEASE PRINCIPAL" : "LOCKED — RELEASE AFTER LOCK"}
              </button>
            </>
          ) : (
            <>
              <h3 className="font-display text-2xl text-gold">Start Investment</h3>
              <label className="block mt-3"><span className="label">Tier</span>
                <select value={tier} onChange={e => setTier(Number(e.target.value))} className="field mt-1">
                  {tiers.map(t => <option key={t.level} value={t.level}>{t.level} · {t.name} · {t.weeklyPct}%/wk · min ${t.min}</option>)}
                </select>
              </label>
              <label className="block mt-3"><span className="label">Amount (USD)</span>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="field mt-1" placeholder={selTier ? `min $${selTier.min}` : ""} /></label>
              <div className="mt-2 flex flex-wrap gap-2">
                {selTier && [selTier.min, selTier.min * 2, Math.floor(me.balance)].filter(v => v > 0).map((v, i) => (
                  <button key={i} onClick={() => setAmount(String(v))} className="btn-outline py-1 px-3 text-xs">${v}</button>
                ))}
              </div>
              {projWeekly > 0 && <div className="mt-3 text-sm text-cream/70">Projected weekly: <b className="text-gold2">${projWeekly}</b></div>}
              <div className="mt-2 text-sm text-cream/70">Lock period: <b className="text-gold">{lockWeeks} weeks</b> <span className="text-cream/40">(admin-set)</span></div>
              {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
              <button className="btn-gold mt-4 w-full" onClick={start}>LOCK &amp; START</button>
            </>
          )}
        </div>

        <div className="card p-6">
          <h4 className="font-display text-xl text-gold">Investment Activity</h4>
          <div className="mt-3 divide-y divide-black/[0.06] max-h-80 overflow-y-auto">
            {history.map(h => (
              <div key={h._id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <div className="text-cream">{LABELS[h.type] || h.type}</div>
                  <div className="text-xs text-cream/40">{new Date(h.createdAt).toLocaleString()}</div>
                </div>
                <div className={`font-semibold ${h.type === "invest_payout" ? "text-gold2" : "text-cream"}`}>{h.type === "invest_lock" ? "-" : "+"}${h.amount}</div>
              </div>
            ))}
            {!history.length && <EmptyState title="No investment activity yet" hint="Lock funds in a tier to start earning weekly returns." />}
          </div>
        </div>
      </div>
    </div>
  );
}

const LABELS = { invest_lock: "Locked principal", invest_payout: "Weekly payout", invest_release: "Released principal" };
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-cream/60">{k}</span><b>{v}</b></div>; }
