"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";
import { LayoutGrid, LineChart, TrendingUp, Users, User, Bell, LogOut, Wallet, Trophy } from "lucide-react";
import Footer from "@/components/Footer";
import ToastProvider, { useToast } from "@/components/Toast";
import ChatWidget from "@/components/ChatWidget";

const MeCtx = createContext(null);
export function useMe() { return useContext(MeCtx); }

// Watches the live balance and toasts when it changes between refreshes.
function BalanceWatcher({ balance }) {
  const toast = useToast();
  const prev = useRef(null);
  useEffect(() => {
    if (balance == null) return;
    if (prev.current != null && Math.abs(balance - prev.current) >= 0.01) {
      toast({ text: `Balance updated: $${balance.toFixed(2)}`, type: "success" });
    }
    prev.current = balance;
  }, [balance, toast]);
  return null;
}

const NAV = [
  { href: "/dashboard",  label: "Home",      icon: LayoutGrid },
  { href: "/analyst",    label: "Analyst",   icon: LineChart },
  { href: "/invest",     label: "Invest",    icon: TrendingUp },
  { href: "/community",  label: "Community", icon: Users },
  { href: "/rewards",    label: "Rewards",   icon: Trophy },
  { href: "/profile",    label: "Profile",   icon: User },
];

export default function AppShell({ children }) {
  const r = useRouter();
  const path = usePathname();
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [bell, setBell] = useState(false);
  const [maint, setMaint] = useState(null);

  async function refresh() {
    try { const d = await api("/api/me"); setMaint(null); setMe(d.user); return d.user; }
    catch (e) {
      // Maintenance mode: keep the session, show a maintenance screen (don't log out).
      if (e?.status === 503 || e?.data?.maintenance) { setMaint(e.data?.error || e.message || "Under maintenance"); return; }
      setToken(null); r.push("/auth");
    }
  }
  useEffect(() => {
    if (!getToken()) { r.push("/auth"); return; }
    refresh().finally(() => setReady(true));
  }, []);

  function logout() { api("/api/auth/logout", { method: "POST" }).catch(() => {}); setToken(null); r.push("/auth"); }
  async function readNotifs() {
    setBell(v => !v);
    if (!bell && me?.notifications?.some(n => !n.read)) {
      await api("/api/me/notifications/read", { method: "POST" }).catch(() => {});
      setMe(m => ({ ...m, notifications: m.notifications.map(n => ({ ...n, read: true })) }));
    }
  }
  async function clearNotifs() {
    await api("/api/me/notifications/clear", { method: "POST" }).catch(() => {});
    setMe(m => ({ ...m, notifications: [] }));
  }

  if (maint) return (
    <div className="min-h-screen bg-ink text-cream grid place-items-center p-6">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gold/10 text-gold text-2xl">🛠️</div>
        <h1 className="font-display text-2xl text-gold">Under maintenance</h1>
        <p className="text-cream/65 mt-2">{maint}</p>
        <button className="btn-outline mt-5" onClick={() => { setReady(false); refresh().finally(() => setReady(true)); }}>Retry</button>
      </div>
    </div>
  );
  if (!ready || !me) return (
    <div className="min-h-screen bg-ink text-cream">
      <div className="h-16 border-b border-gold/10 flex items-center px-4 md:px-6">
        <div className="skeleton h-6 w-28" />
      </div>
      <div className="mx-auto max-w-[88rem] px-4 md:px-6 py-6 space-y-4">
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="skeleton h-20" /><div className="skeleton h-20" /><div className="skeleton h-20" />
        </div>
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    </div>
  );
  const unread = (me.notifications || []).filter(n => !n.read).length;

  return (
    <ToastProvider>
    <MeCtx.Provider value={{ me, setMe, refresh }}>
      <BalanceWatcher balance={me.balance} />
      <div className="min-h-screen bg-ink text-cream">
        {/* top bar */}
        <header className="sticky top-0 z-40 border-b border-gold/10 bg-ink/85 backdrop-blur">
          <div className="mx-auto max-w-[88rem] px-4 md:px-6 h-16 flex items-center justify-between gap-4">
            <Link href="/dashboard" className="font-display text-2xl tracking-widest text-gold">SHEIN</Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(n => {
                const Icon = n.icon; const on = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href));
                return (
                  <Link key={n.href} href={n.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition ${on ? "bg-gold2/10 text-gold2" : "text-cream/70 hover:text-cream"}`}>
                    <Icon size={16} /> {n.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link href="/wallet/deposit" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold/30 text-sm">
                <Wallet size={15} className="text-gold" /> <span className="text-gold font-semibold">${me.balance?.toFixed(2) ?? "0.00"}</span>
              </Link>
              <div className="relative">
                <button onClick={readNotifs} className="relative grid h-9 w-9 place-items-center rounded-full border border-gold/20 hover:border-gold/50">
                  <Bell size={16} />
                  {unread > 0 && <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full gold-grad text-[10px] font-bold text-white px-1">{unread}</span>}
                </button>
                {bell && (
                  <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto card p-2 z-50">
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="label">Notifications</span>
                      {(me.notifications || []).length > 0 && <button onClick={clearNotifs} className="text-[11px] text-gold2 hover:underline">Clear all</button>}
                    </div>
                    {(me.notifications || []).length === 0 && <div className="text-cream/50 text-sm px-2 py-3">Nothing yet.</div>}
                    {(me.notifications || []).map((n, i) => (
                      <div key={i} className="px-2 py-2 rounded-lg hover:bg-black/[0.04]">
                        <div className="text-sm text-cream">{n.text}</div>
                        <div className="text-[11px] text-cream/40">{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/profile" className="grid h-9 w-9 place-items-center rounded-full gold-grad text-white font-display font-bold overflow-hidden">
                {me.avatar ? <img src={me.avatar} alt="" className="h-full w-full object-cover" /> : (me.username || me.email)[0]?.toUpperCase()}
              </Link>
              <button onClick={logout} title="Sign out" className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-gold/20 hover:border-gold/50"><LogOut size={15} /></button>
            </div>
          </div>
        </header>

        {me.frozen?.active && (
          <div className="mx-auto max-w-6xl px-4 pt-3">
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500/20 text-red-500 text-lg">⚠</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-red-500">Account in deficit — ${Number(me.frozen.amount || 0).toLocaleString()} outstanding</div>
                  <div className="text-sm text-cream/70 mt-0.5">{me.frozen.reason || "Your account is frozen."} Earning, withdrawals and investing are paused until this is cleared. Send the outstanding amount, then contact support to restore your account.</div>
                  <div className="mt-2 flex gap-2">
                    <Link href="/wallet/deposit" className="btn-gold text-sm">Deposit now</Link>
                    <Link href="/support" className="btn-outline text-sm">Contact support</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {children}

        <Footer />
        <ChatWidget />

        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gold/15 bg-ink/95 backdrop-blur">
          <div className="grid grid-cols-5">
            {NAV.map(n => {
              const Icon = n.icon; const on = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href));
              return (
                <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${on ? "text-gold2" : "text-cream/55"}`}>
                  <Icon size={19} /> {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </MeCtx.Provider>
    </ToastProvider>
  );
}
