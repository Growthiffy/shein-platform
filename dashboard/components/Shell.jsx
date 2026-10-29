"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, setToken, getToken } from "@/lib/api";
import { useEffect } from "react";
import { LayoutDashboard, Users, Package, ArrowLeftRight, Wallet, GraduationCap, MessagesSquare, Bot, Settings, History, LifeBuoy, UserPlus, LogOut } from "lucide-react";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/tx", label: "Transactions", icon: ArrowLeftRight },
  { href: "/wallets", label: "Deposit Wallets", icon: Wallet },
  { href: "/mentors", label: "Mentors", icon: GraduationCap },
  { href: "/community", label: "Community", icon: MessagesSquare },
  { href: "/personas", label: "Personas", icon: Bot },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/referrals", label: "Referrals", icon: UserPlus },
  { href: "/login-history", label: "Login History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Shell({ children }) {
  const p = usePathname();
  const r = useRouter();
  useEffect(() => {
    if (!getToken()) { r.push("/"); return; }
    api("/api/me")
      .then(d => { if (!(d.user?.isAdmin || d.user?.role === "admin")) { setToken(null); r.push("/"); } })
      .catch(() => { setToken(null); r.push("/"); });
  }, []);
  return (
    <main className="min-h-screen flex bg-ink text-cream">
      <aside className="w-60 shrink-0 border-r border-gold/10 p-4 flex flex-col">
        <div className="font-display text-xl text-gold tracking-widest mb-5 px-2">SHEIN · Admin</div>
        <nav className="space-y-0.5 flex-1">
          {NAV.map(n => {
            const Icon = n.icon; const on = p === n.href || (n.href !== "/overview" && p.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${on ? "bg-gold/15 text-gold" : "text-cream/75 hover:bg-white/5"}`}>
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
