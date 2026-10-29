"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Users, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, DollarSign, Wallet, Bot, LifeBuoy } from "lucide-react";

export default function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { api("/api/admin/stats").then(d => setS(d.stats)).catch(() => {}); }, []);

  const cards = [
    { label: "Members", value: s?.users, icon: Users, href: "/users" },
    { label: "Verified", value: s?.verified, icon: CheckCircle2, href: "/users" },
    { label: "Pending Deposits", value: s?.pendingDeposits, icon: ArrowDownToLine, href: "/tx", hot: s?.pendingDeposits > 0 },
    { label: "Pending Withdrawals", value: s?.pendingWithdrawals, icon: ArrowUpFromLine, href: "/tx", hot: s?.pendingWithdrawals > 0 },
    { label: "Deposit Volume", value: s ? `$${s.depositVolume}` : null, icon: DollarSign, href: "/tx" },
    { label: "Member Balances", value: s ? `$${s.totalBalances}` : null, icon: Wallet, href: "/users" },
    { label: "Active Personas", value: s?.activePersonas, icon: Bot, href: "/personas" },
    { label: "Open Support", value: s?.openSupport, icon: LifeBuoy, href: "/support", hot: s?.openSupport > 0 },
  ];

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-1 font-display">Overview</h1>
      <p className="text-cream/50 text-sm mb-5">Platform at a glance.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => { const Icon = c.icon; return (
          <Link key={c.label} href={c.href} className="stat hover:border-gold/45 transition">
            <div className="flex items-center justify-between">
              <span className="label">{c.label}</span>
              <Icon size={16} className={c.hot ? "text-amber-400" : "text-gold"} />
            </div>
            <div className={`text-2xl font-semibold mt-2 ${c.hot ? "text-amber-400" : ""}`}>{c.value ?? "—"}</div>
          </Link>
        ); })}
      </div>
    </Shell>
  );
}
