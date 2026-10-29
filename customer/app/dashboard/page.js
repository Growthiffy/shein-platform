"use client";
import { useState } from "react";
import Link from "next/link";
import AppShell, { useMe } from "@/components/AppShell";
import { LineChart, TrendingUp, Users, Crown, ArrowUpRight, Wallet, UserPlus } from "lucide-react";

export default function DashboardPage() { return <AppShell><Body /></AppShell>; }

const TILES = [
  { href: "/analyst",   title: "Product Analyst", desc: "Analyze 27 curated products per cycle. Earn commission.", icon: LineChart },
  { href: "/invest",    title: "Invest",          desc: "7 membership tiers with weekly returns.",                 icon: TrendingUp },
  { href: "/community", title: "Community",       desc: "Chat with analysts and investors.",                       icon: Users },
  { href: "/mentor",    title: "Mentor",          desc: "Choose a personal guide.",                                icon: Crown },
];

function Body() {
  const { me } = useMe();
  const [welcome, setWelcome] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return !sessionStorage.getItem("shein_welcome_seen"); } catch { return false; }
  });
  function dismiss() { setWelcome(false); try { sessionStorage.setItem("shein_welcome_seen", "1"); } catch {} }

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label">Welcome back</div>
          <h1 className="font-display text-3xl md:text-4xl text-gold">{me.username || me.email.split("@")[0]}</h1>
        </div>
        <span className="chip"><Crown size={12} /> {me.level}</span>
      </div>

      {/* balance strip */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="stat fadein"><div className="label">Balance</div><div className="text-2xl font-semibold text-gold mt-1">${me.balance?.toFixed(2) ?? "0.00"}</div></div>
        <div className="stat fadein-2"><div className="label">Total Earned</div><div className="text-2xl font-semibold mt-1">${me.totalEarned?.toFixed(2) ?? "0.00"}</div></div>
        <div className="stat fadein-3"><div className="label">Daily Salary</div><div className="text-2xl font-semibold mt-1">${me.dailySalary ?? 230}</div></div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/wallet/deposit" className="btn-gold"><Wallet size={16} /> Deposit</Link>
        <Link href="/wallet/withdraw" className="btn-outline"><ArrowUpRight size={16} /> Withdraw</Link>
        <Link href="/referral" className="btn-outline"><UserPlus size={16} /> Invite &amp; Earn</Link>
      </div>

      <h2 className="mt-10 font-display text-2xl text-gold">Your paths</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {TILES.map((t, i) => { const Icon = t.icon; return (
          <Link key={t.href} href={t.href} className={`card card-hover p-6 fadein${i ? "-2" : ""}`}>
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold"><Icon size={20} /></span>
              <ArrowUpRight className="text-gold/60" size={18} />
            </div>
            <h3 className="font-display text-xl text-gold mt-4">{t.title}</h3>
            <p className="text-cream/65 mt-1 text-sm">{t.desc}</p>
          </Link>
        ); })}
      </div>

      {welcome && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={dismiss}>
          <div className="card max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-cream/60 hover:text-gold text-2xl leading-none" onClick={dismiss}>×</button>
            <h3 className="font-display text-2xl text-gold mb-4">How Shein works</h3>
            <ol className="space-y-3 text-sm text-cream/80 list-decimal pl-5">
              <li>Deposit funds (optional) — reach a level to earn more per product.</li>
              <li>The Analyst screen hands you products at a buying rate below retail.</li>
              <li>Submit with a comment → commission credited to your balance.</li>
              <li>Withdraw to your own wallet any time your balance clears.</li>
              <li>Prefer passive growth? Lock funds in Invest tiers for weekly profit.</li>
            </ol>
            <button className="btn-gold mt-6 w-full" onClick={dismiss}>GOT IT</button>
          </div>
        </div>
      )}
    </div>
  );
}
