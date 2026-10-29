"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const r = useRouter();
  const [me, setMe] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    api("/api/me").then(d => setMe(d.user)).catch(() => r.push("/auth"));
    if (sessionStorage.getItem("shein_welcome_seen")) setShowWelcome(false);
  }, []);
  function dismissWelcome() { setShowWelcome(false); sessionStorage.setItem("shein_welcome_seen", "1"); }

  if (!me) return <div className="min-h-screen flex items-center justify-center bg-ink text-cream">Loading…</div>;

  return (
    <main className="min-h-screen bg-ink text-cream">
      <TopBar me={me} />
      <section className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-4xl text-gold">Welcome, {me.username || me.email.split("@")[0]}</h1>
        <p className="text-cream/60 mt-2">Choose your path.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <Tile href="/analyst"   title="Product Analyst" desc="Analyze 27 curated products per cycle. Earn commission." />
          <Tile href="/invest"    title="Invest"          desc="7 membership tiers with weekly returns." />
          <Tile href="/community" title="Community"       desc="Chat with analysts and investors." />
          <Tile href="/mentor"    title="Mentor"          desc="Choose a personal guide." />
        </div>
      </section>

      {showWelcome && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={dismissWelcome}>
          <div className="card max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-3 text-cream/60 hover:text-gold text-xl" onClick={dismissWelcome}>×</button>
            <h3 className="font-display text-2xl text-gold mb-4">How Shein works</h3>
            <ol className="space-y-3 text-sm text-cream/80 list-decimal pl-5">
              <li>Deposit funds (optional) — reach a level to earn more per product.</li>
              <li>Analyst screen hands you products at a buying rate below retail.</li>
              <li>Submit with a comment → commission credited to your balance.</li>
              <li>Withdraw to your own wallet any time your balance clears.</li>
              <li>Prefer passive growth? Lock funds in Invest tiers for weekly profit.</li>
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}

function TopBar({ me }) {
  return (
    <header className="flex justify-between items-center px-6 py-4 border-b border-gold/10">
      <div className="font-display text-2xl text-gold tracking-widest">SHEIN</div>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/analyst/demo" className="px-3 py-1 rounded-full border border-gold/30 text-cream/80 hover:text-gold">Demo</Link>
        <span className="text-cream/60">Balance</span>
        <span className="text-gold font-semibold">${me.balance?.toFixed(2) ?? "0.00"}</span>
      </div>
    </header>
  );
}

function Tile({ href, title, desc }) {
  return (
    <Link href={href} className="card p-6 hover:border-gold/40 transition">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-gold">{title}</h3>
        <span className="text-gold">→</span>
      </div>
      <p className="text-cream/70 mt-2 text-sm">{desc}</p>
    </Link>
  );
}
