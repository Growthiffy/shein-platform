"use client";
import { useEffect, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";

export default function InvestPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, refresh } = useMe();
  const [tiers, setTiers] = useState([]);
  const [amount, setAmount] = useState("");
  const [tier, setTier] = useState(1);
  const [lockWeeks, setLockWeeks] = useState(4);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/invest/tiers").then(d => { setTiers(d.tiers); if (d.lockWeeks != null) setLockWeeks(d.lockWeeks); });
  }, []);

  async function start() {
    setErr("");
    try { await api("/api/invest/start", { method: "POST", body: { amount: Number(amount), tierLevel: tier } }); await refresh(); setAmount(""); }
    catch (e) { setErr(e.message); }
  }
  async function release() {
    setErr("");
    try { await api("/api/invest/release", { method: "POST" }); await refresh(); }
    catch (e) { setErr(e.message); }
  }

  const active = me.investment?.amount > 0;

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
                <tr key={t.level} className="border-t border-line">
                  <td className="p-3 text-gold font-semibold">{t.level}</td>
                  <td className="p-3">{t.name}</td>
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
              <h3 className="font-display text-2xl text-gold">Active Investment</h3>
              <div className="mt-3 text-sm space-y-1">
                <Row k="Tier" v={me.investment.tier} />
                <Row k="Amount" v={`$${me.investment.amount}`} />
                <Row k="Lock until" v={me.investment.lockUntil ? new Date(me.investment.lockUntil).toLocaleDateString() : "—"} />
              </div>
              {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
              <button className="btn-gold mt-4 w-full" onClick={release}>RELEASE (after lock)</button>
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
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="field mt-1" /></label>
              <div className="mt-3 text-sm text-cream/70">Lock period: <b className="text-gold">{lockWeeks} weeks</b> <span className="text-cream/40">(set by admin)</span></div>
              {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
              <button className="btn-gold mt-4 w-full" onClick={start}>LOCK &amp; START</button>
            </>
          )}
        </div>
        <div className="card p-6 text-sm text-cream/80 leading-relaxed">
          <h4 className="font-display text-xl text-gold">How it works</h4>
          <p className="mt-2">Can&apos;t work daily? Invest, and weekly profit lands in your balance automatically. The lock duration is fixed by the admin at the start.</p>
        </div>
      </div>
    </div>
  );
}
function Row({ k, v }) { return <div className="flex justify-between"><span className="text-cream/60">{k}</span><b>{v}</b></div>; }
