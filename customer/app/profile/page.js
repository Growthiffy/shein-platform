"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { ShieldCheck, Wallet, Copy, Crown, LineChart, TrendingUp, UserPlus, Shield, LifeBuoy, Check, Pencil } from "lucide-react";

const LEVELS = [
  { key: "beginner", name: "Beginner", salary: 230, required: 0,    normal: 1.2, latest: 23 },
  { key: "silver",   name: "Silver",   salary: 500, required: 1000, normal: 2,   latest: 28 },
  { key: "gold",     name: "Gold",     salary: 750, required: 2000, normal: 4,   latest: 35 },
];
const QUICK = [
  { label: "Deposit",  href: "/wallet/deposit",  icon: Wallet },
  { label: "Withdraw", href: "/wallet/withdraw", icon: Wallet },
  { label: "Analyst",  href: "/analyst",         icon: LineChart },
  { label: "Invest",   href: "/invest",          icon: TrendingUp },
  { label: "Invite",   href: "/referral",        icon: UserPlus },
  { label: "Mentor",   href: "/mentor",          icon: Crown },
  { label: "Security", href: "/security",        icon: Shield },
  { label: "Support",  href: "/support",         icon: LifeBuoy },
];

export default function ProfilePage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, setMe, refresh } = useMe();
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState(me.phone || "");
  const [savingPhone, setSavingPhone] = useState(false);

  async function setUsername() {
    const name = prompt("Choose a username (min 3 chars):", me.username || "");
    if (!name) return;
    try { await api("/api/me/username", { method: "POST", body: { username: name.trim() } }); await refresh(); }
    catch (e) { alert(e.message); }
  }
  async function savePhone() {
    setSavingPhone(true);
    try { const d = await api("/api/me/profile", { method: "POST", body: { phone: phone.trim() } }); setMe(d.user); }
    catch (e) { alert(e.message); } finally { setSavingPhone(false); }
  }
  function copyCode() { navigator.clipboard?.writeText(me.referralCode || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  const cred = me.creditScore ?? 100;
  const credTone = cred >= 80 ? "text-emerald-400" : cred >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="page space-y-6">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Profile</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* identity + balance */}
        <div className="card p-6 lg:col-span-2 fadein">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full gold-grad text-black font-display text-2xl font-bold">
                {(me.username || me.email)[0]?.toUpperCase()}
              </div>
              <div>
                <button onClick={setUsername} className="flex items-center gap-2 font-display text-2xl text-gold hover:underline">
                  @{me.username || "set-username"} <Pencil size={14} className="text-cream/40" />
                </button>
                <div className="text-sm text-cream/50">{me.email}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="chip"><Crown size={12} /> {me.level}</span>
                  {me.accountNumber && <span className="text-xs text-cream/40">Member #{me.accountNumber}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="stat">
              <div className="label">Balance</div>
              <div className="text-2xl font-semibold text-gold mt-1">${me.balance?.toFixed(2) ?? "0.00"}</div>
            </div>
            <div className="stat">
              <div className="label">Total Earned</div>
              <div className="text-2xl font-semibold mt-1">${me.totalEarned?.toFixed(2) ?? "0.00"}</div>
            </div>
            <div className="stat">
              <div className="label">Daily Salary</div>
              <div className="text-2xl font-semibold mt-1">${me.dailySalary ?? 230}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-gold/15 p-4">
            <div className="label">Referral Code</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-lg tracking-widest text-gold">{me.referralCode || "—"}</span>
              <button onClick={copyCode} className="btn-outline py-1.5 px-3 text-sm">
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </div>
        </div>

        {/* credibility */}
        <div className="card p-6 fadein-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold"><ShieldCheck size={22} /></span>
            <div>
              <h3 className="font-display text-xl text-gold">Credibility</h3>
              <p className="text-xs text-cream/50">Platform trust rating</p>
            </div>
          </div>
          <div className="mt-6 flex items-end justify-between">
            <span className="text-4xl font-bold">{cred}%</span>
            <span className={`text-xs font-semibold ${credTone}`}>{cred >= 80 ? "EXCELLENT" : cred >= 50 ? "GOOD" : "LOW"}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full gold-grad" style={{ width: `${cred}%` }} />
          </div>
          <p className="mt-3 text-sm italic text-cream/45">Keep a high score to unlock premium benefits and faster withdrawals.</p>
        </div>
      </div>

      {/* membership levels */}
      <div className="card p-6 fadein-2">
        <div className="mb-4 flex items-center gap-2"><Crown className="text-gold" size={18} /><h3 className="font-display text-xl text-gold">Membership Levels</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="label"><th className="text-left pb-2">Level</th><th className="text-left pb-2">Daily Salary</th><th className="text-left pb-2">Required</th><th className="text-left pb-2">Normal %</th><th className="text-left pb-2">Latest %</th></tr></thead>
            <tbody>
              {LEVELS.map(l => (
                <tr key={l.key} className="border-t border-white/5">
                  <td className="py-3 font-semibold text-cream">
                    {l.name} {me.level === l.key && <span className="ml-1 rounded-full gold-grad px-2 py-0.5 text-[10px] font-bold text-black">CURRENT</span>}
                  </td>
                  <td className="py-3 text-cream/70">${l.salary}/day</td>
                  <td className="py-3 text-cream/70">${l.required}</td>
                  <td className="py-3 text-cream/70">{l.normal}%</td>
                  <td className="py-3 text-cream/70">{l.latest}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* account details */}
      <div className="card p-6 fadein-3">
        <h3 className="mb-4 font-display text-xl text-gold">Account Details</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><div className="label">Member Since</div><div className="mt-1">{me.createdAt ? new Date(me.createdAt).toLocaleDateString() : "—"}</div></div>
          <div><div className="label">Email</div><div className="mt-1 break-all">{me.email}</div></div>
          <div>
            <div className="label">Phone</div>
            <div className="mt-1 flex gap-2">
              <input className="field py-2" value={phone} onChange={e => setPhone(e.target.value)} placeholder="optional" />
              <button onClick={savePhone} disabled={savingPhone || phone.trim() === (me.phone || "")} className="btn-gold px-4 py-2 text-sm">Save</button>
            </div>
          </div>
        </div>
      </div>

      {/* quick actions */}
      <h3 className="font-display text-xl text-gold">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {QUICK.map(q => { const Icon = q.icon; return (
          <Link key={q.label} href={q.href} className="card card-hover flex flex-col items-center gap-3 p-5">
            <Icon className="text-gold" size={22} /><span className="text-sm font-medium">{q.label}</span>
          </Link>
        ); })}
      </div>
    </div>
  );
}
