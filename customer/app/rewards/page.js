"use client";
import { useEffect, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Flame, Trophy, Medal, Crown, Shield, Search, BarChart3, Wallet, Banknote, TrendingUp, Users, CheckCircle2, Lock } from "lucide-react";

const ICONS = { flame: Flame, trophy: Trophy, medal: Medal, crown: Crown, shield: Shield, search: Search, chart: BarChart3, wallet: Wallet, cash: Banknote, trend: TrendingUp, users: Users };

export default function RewardsPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { refresh } = useMe();
  const [checkin, setCheckin] = useState(null);
  const [ach, setAch] = useState(null);
  const [board, setBoard] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const [c, a, b] = await Promise.all([
      api("/api/me/checkin").catch(() => null),
      api("/api/me/achievements").catch(() => null),
      api("/api/stats/leaderboard").catch(() => null),
    ]);
    setCheckin(c); setAch(a); setBoard(b);
  }
  useEffect(() => { load(); }, []);

  async function doCheckin() {
    setBusy(true); setMsg("");
    try {
      const d = await api("/api/me/checkin", { method: "POST" });
      if (d.already) setMsg("Already checked in today — come back tomorrow!");
      else setMsg(`Day ${d.streak} 🔥  +$${d.reward} bonus credit!`);
      await load(); await refresh();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Rewards</h1>
      <p className="text-cream/60">Streaks, achievements and the weekly leaderboard.</p>

      {/* Daily check-in */}
      <div className="card mt-6 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"><Flame size={26} /></div>
        <div className="flex-1">
          <div className="font-display text-xl text-gold">Daily Check-in</div>
          <div className="text-cream/65 text-sm">Current streak: <b className="text-cream">{checkin?.streak ?? 0} day{(checkin?.streak ?? 0) === 1 ? "" : "s"}</b>. Check in daily for a growing bonus (up to $35/day).</div>
          {msg && <div className="text-emerald-500 text-sm mt-1">{msg}</div>}
        </div>
        <button className="btn-gold shrink-0 disabled:opacity-50" disabled={busy || checkin?.checkedInToday} onClick={doCheckin}>
          {checkin?.checkedInToday ? "Checked in ✓" : busy ? "…" : "Check in"}
        </button>
      </div>

      {/* Achievements */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl text-gold">Achievements</h2>
        {ach && <span className="text-cream/55 text-sm">{ach.unlocked}/{ach.total} unlocked</span>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(ach?.items || []).map(a => {
          const Icon = ICONS[a.icon] || Trophy;
          return (
            <div key={a.key} className={`card p-4 flex items-center gap-3 ${a.done ? "" : "opacity-55"}`}>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${a.done ? "bg-gold/15 text-gold" : "bg-black/5 text-cream/40"}`}>
                {a.done ? <Icon size={20} /> : <Lock size={18} />}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-cream font-medium">{a.title}{a.done && <CheckCircle2 size={14} className="text-emerald-500" />}</div>
                <div className="text-xs text-cream/55 truncate">{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl text-gold">Weekly Top Earners</h2>
        {board?.you && <span className="text-cream/55 text-sm">You: #{board.you.rank} · ${Number(board.you.earned).toLocaleString()}</span>}
      </div>
      <div className="card mt-4 divide-y divide-line">
        {(board?.items || []).map(r => (
          <div key={r.rank} className={`flex items-center gap-3 px-4 py-2.5 ${r.isYou ? "bg-gold/10" : ""}`}>
            <span className={`w-7 text-center font-display ${r.rank <= 3 ? "text-gold text-lg" : "text-cream/50"}`}>{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</span>
            {r.avatar && <img src={r.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-line" loading="lazy" />}
            <span className="flex-1 text-cream truncate">{r.flag ? r.flag + " " : ""}{r.name}{r.isYou && <span className="ml-1 text-xs text-gold2">(you)</span>}</span>
            <span className="text-xs text-cream/45 capitalize hidden sm:block">{r.level}</span>
            <span className="text-emerald-500 font-semibold tabular-nums">${Number(r.earned).toLocaleString()}</span>
          </div>
        ))}
        {!board?.items?.length && <div className="px-4 py-6 text-cream/50 text-sm">Leaderboard loading…</div>}
      </div>
    </div>
  );
}
