"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { Users, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, DollarSign, Wallet, Bot, LifeBuoy, Megaphone, Send } from "lucide-react";

export default function Overview() {
  const [s, setS] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [bc, setBc] = useState("");
  const [bcMsg, setBcMsg] = useState("");

  async function load() {
    const d = await api("/api/admin/stats");
    setS(d.stats); setRecentUsers(d.recentUsers || []); setRecentTx(d.recentTx || []);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function broadcast() {
    setBcMsg("");
    if (!bc.trim()) return;
    try { const d = await api("/api/admin/broadcast", { method: "POST", body: { text: bc.trim() } }); setBc(""); setBcMsg(`sent to ${d.sent} members ✓`); }
    catch (e) { setBcMsg(e.message); }
  }

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
              <Icon size={16} className={c.hot ? "text-amber-500" : "text-gold2"} />
            </div>
            <div className={`text-2xl font-semibold mt-2 ${c.hot ? "text-amber-500" : ""}`}>{c.value ?? "—"}</div>
          </Link>
        ); })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mt-6">
        <div className="card p-4 lg:col-span-2">
          <h2 className="text-gold mb-3">Recent transactions</h2>
          <div className="divide-y divide-line">
            {recentTx.map(t => (
              <div key={t.id} className="py-2 flex items-center justify-between text-sm">
                <div><span className="text-cream">{t.user}</span> <span className="chip ml-1">{t.type}</span></div>
                <div className="flex items-center gap-3"><span className="text-cream/50">{t.status}</span><b>${t.amount}</b></div>
              </div>
            ))}
            {!recentTx.length && <div className="text-cream/50 text-sm py-3">No transactions.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2"><Megaphone size={16} className="text-gold2" /><h2 className="text-gold">Broadcast</h2></div>
            <p className="text-xs text-cream/50 mb-2">Send an in-app notification to all members.</p>
            <textarea rows={2} value={bc} onChange={e => setBc(e.target.value)} className="w-full" placeholder="Message to all members…" />
            <button className="btn w-full mt-2" onClick={broadcast}><Send size={14} /> Send to all</button>
            {bcMsg && <div className="text-xs text-cream/60 mt-2">{bcMsg}</div>}
          </div>
          <div className="card p-4">
            <h2 className="text-gold mb-2">New members</h2>
            <div className="divide-y divide-line">
              {recentUsers.map(u => (
                <div key={u._id} className="py-2 text-sm flex items-center justify-between">
                  <span className="text-cream truncate">{u.username || u.email}</span>
                  <span className={u.emailVerified ? "text-emerald-500 text-xs" : "text-cream/40 text-xs"}>{u.emailVerified ? "verified" : "pending"}</span>
                </div>
              ))}
              {!recentUsers.length && <div className="text-cream/50 text-sm py-3">No members yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
