"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Invest() {
  const r = useRouter();
  const [tiers, setTiers] = useState([]);
  const [me, setMe] = useState(null);
  const [amount, setAmount] = useState("");
  const [tier, setTier] = useState(1);
  const [lockWeeks, setLockWeeks] = useState(4);
  const [err, setErr] = useState("");

  async function load() { setMe((await api("/api/me")).user); }
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    api("/api/invest/tiers").then(d => { setTiers(d.tiers); if (d.lockWeeks != null) setLockWeeks(d.lockWeeks); });
    load();
  }, []);

  async function start() {
    setErr("");
    try { await api("/api/invest/start", { method: "POST", body: { amount: Number(amount), tierLevel: tier } }); await load(); setAmount(""); }
    catch (e) { setErr(e.message); }
  }
  async function release() {
    setErr("");
    try { await api("/api/invest/release", { method: "POST" }); await load(); }
    catch (e) { setErr(e.message); }
  }

  if (!me) return <div className="min-h-screen flex items-center justify-center bg-ink text-cream">Loading…</div>;
  const active = me.investment?.amount > 0;

  return (
    <main className="min-h-screen bg-ink text-cream">
      <header className="px-6 py-4 border-b border-gold/10"><Link href="/dashboard" className="font-display text-xl text-gold">← Shein</Link></header>
      <section className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="font-display text-4xl text-gold">Invest</h1>
        <p className="text-cream/70">Lock funds and earn weekly. Minimum withdrawal and lock windows set per tier.</p>

        <div className="mt-6 card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-black/40">
              <tr className="text-cream/70">
                <th className="text-left p-3">Level</th><th className="text-left p-3">Membership</th>
                <th className="text-left p-3">Weekly Profit</th><th className="text-left p-3">Min. Amount</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(t => (
                <tr key={t.level} className="border-t border-white/5">
                  <td className="p-3 text-gold font-semibold">{t.level}</td>
                  <td className="p-3">{t.name}</td>
                  <td className="p-3">{t.weeklyPct}%</td>
                  <td className="p-3">${t.min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            {active ? (
              <>
                <h3 className="font-display text-2xl text-gold">Active Investment</h3>
                <div className="mt-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Tier</span><b>{me.investment.tier}</b></div>
                  <div className="flex justify-between"><span>Amount</span><b>${me.investment.amount}</b></div>
                  <div className="flex justify-between"><span>Lock until</span><b>{me.investment.lockUntil && new Date(me.investment.lockUntil).toLocaleDateString()}</b></div>
                </div>
                <button className="btn-gold mt-4 w-full" onClick={release}>RELEASE (after lock)</button>
              </>
            ) : (
              <>
                <h3 className="font-display text-2xl text-gold">Start Investment</h3>
                <label className="block mt-2">
                  <span className="text-xs tracking-widest text-cream/60">TIER</span>
                  <select value={tier} onChange={e => setTier(Number(e.target.value))} className="w-full mt-1 bg-black/40 border border-gold/20 rounded-lg px-3 py-2 outline-none focus:border-gold">
                    {tiers.map(t => <option key={t.level} value={t.level}>{t.level} · {t.name} · {t.weeklyPct}%/wk · min ${t.min}</option>)}
                  </select>
                </label>
                <Input label="Amount (USD)"     value={amount} onChange={setAmount} type="number" />
                <div className="mt-3 text-sm text-cream/70">Lock period: <b className="text-gold">{lockWeeks} weeks</b> <span className="text-cream/40">(set by admin)</span></div>
                {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
                <button className="btn-gold mt-3 w-full" onClick={start}>LOCK & START</button>
              </>
            )}
          </div>
          <div className="card p-6 text-sm text-cream/80 leading-relaxed">
            <h4 className="font-display text-xl text-gold">How it works</h4>
            <p className="mt-2">Can&apos;t work daily? Invest, and weekly profit lands in your balance. Minimum withdrawal and lock duration are set at the start.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block mt-2">
      <span className="text-xs tracking-widest text-cream/60">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 bg-black/40 border border-gold/20 rounded-lg px-3 py-2 outline-none focus:border-gold" />
    </label>
  );
}
