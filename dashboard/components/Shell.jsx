"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setToken, getToken } from "@/lib/api";
import { useEffect, useState } from "react";
import NotifBell from "@/components/NotifBell";
import { LayoutDashboard, Users, Package, ArrowLeftRight, Wallet, GraduationCap, MessagesSquare, Bot, Settings, History, LifeBuoy, UserPlus, LogOut, ShieldCheck, Megaphone, UsersRound, Layers, FileText, Inbox } from "lucide-react";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, perm: null },
  { href: "/my-juniors", label: "My Juniors", icon: UsersRound, perm: null, mentorOnly: true },
  { href: "/users", label: "Members", icon: Users, perm: "members" },
  { href: "/products", label: "Products", icon: Package, perm: "products" },
  { href: "/combos", label: "Combos", icon: Layers, perm: "members" },
  { href: "/tx", label: "Transactions", icon: ArrowLeftRight, perm: "transactions" },
  { href: "/wallets", label: "Deposit Wallets", icon: Wallet, perm: "wallets" },
  { href: "/mentors", label: "Mentors", icon: GraduationCap, perm: "mentors" },
  { href: "/community", label: "Community", icon: MessagesSquare, perm: "community" },
  { href: "/announcements", label: "Announcements", icon: Megaphone, perm: "announcements" },
  { href: "/personas", label: "Personas", icon: Bot, perm: "personas" },
  { href: "/support", label: "Support", icon: LifeBuoy, perm: "support" },
  { href: "/inbox", label: "Inbox", icon: Inbox, perm: "support" },
  { href: "/content", label: "Content", icon: FileText, perm: "settings" },
  { href: "/referrals", label: "Referrals", icon: UserPlus, perm: "referrals" },
  { href: "/login-history", label: "Login History", icon: History, perm: "login_history" },
  { href: "/admins", label: "Admins", icon: ShieldCheck, perm: "admins", ownerOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, perm: "settings" },
];

// Module-level caches persist across client-side navigations (Shell remounts per
// page). Seeding state from them stops the nav — especially "My Juniors" — from
// flickering out while /api/me + /api/mentor-admin/me re-resolve on every route.
let ME_CACHE = null;
let IS_MENTOR_CACHE = false;

export default function Shell({ children }) {
  const p = usePathname();
  const r = useRouter();
  const [me, setMe] = useState(ME_CACHE);
  const [isMentor, setIsMentor] = useState(IS_MENTOR_CACHE);
  useEffect(() => {
    if (!getToken()) { r.push("/"); return; }
    api("/api/me")
      .then(d => { if (!(d.user?.isAdmin || d.user?.role === "admin")) { ME_CACHE = null; setToken(null); r.push("/"); } else { ME_CACHE = d.user; setMe(d.user); } })
      .catch(() => { setToken(null); r.push("/"); });
    api("/api/mentor-admin/me").then(d => { IS_MENTOR_CACHE = !!d.mentor; setIsMentor(IS_MENTOR_CACHE); }).catch(() => {});
  }, []);

  const full = !me || me.fullAccess !== false;
  const can = (n) => {
    // Owners always see My Juniors (owner-sees-all mentors); restricted admins see
    // it only when assigned a mentor. Not gated purely on the async isMentor, so it
    // never flickers out for owners on navigation.
    if (n.mentorOnly) return full || isMentor;
    if (!n.perm) return true;
    if (full) return true;
    if (n.ownerOnly) return false;
    return (me?.permissions || []).includes(n.perm);
  };
  const nav = NAV.filter(can);
  return (
    <main className="min-h-screen flex bg-ink text-cream">
      <aside className="w-60 shrink-0 border-r border-gold/10 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-5 px-2">
          <span className="font-display text-xl text-gold tracking-widest">SHEIN · Admin</span>
          <NotifBell />
        </div>
        <nav className="space-y-0.5 flex-1">
          {nav.map(n => {
            const Icon = n.icon; const on = p === n.href || (n.href !== "/overview" && p.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${on ? "bg-gold/15 text-gold" : "text-cream/75 hover:bg-black/[0.04]"}`}>
                <Icon size={16} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => { setToken(null); r.push("/"); }} className="btn-ghost mt-4 w-full"><LogOut size={15} /> Sign Out</button>
      </aside>
      <section className="flex-1 p-6 overflow-x-auto">{children}</section>
    </main>
  );
}
