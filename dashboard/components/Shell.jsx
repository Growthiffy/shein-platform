"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { setToken, getToken } from "@/lib/api";
import { useEffect } from "react";

const NAV = [
  { href: "/users", label: "Users" },
  { href: "/products", label: "Products" },
  { href: "/tx", label: "Transactions" },
  { href: "/wallets", label: "Deposit Wallets" },
  { href: "/mentors", label: "Mentors" },
  { href: "/community", label: "Community" },
];

export default function Shell({ children }) {
  const p = usePathname();
  const r = useRouter();
  useEffect(() => { if (!getToken()) r.push("/"); }, []);
  return (
    <main className="min-h-screen flex bg-ink text-cream">
      <aside className="w-56 border-r border-gold/10 p-4 space-y-1">
        <div className="text-xl text-gold mb-4">SHEIN · Admin</div>
        {NAV.map(n => (
          <Link key={n.href} href={n.href}
            className={`block px-3 py-2 rounded ${p.startsWith(n.href) ? "bg-gold/20 text-gold" : "hover:bg-white/5"}`}>
            {n.label}
          </Link>
        ))}
        <button onClick={() => { setToken(null); r.push("/"); }} className="btn-ghost mt-6 w-full">Sign Out</button>
      </aside>
      <section className="flex-1 p-6 overflow-x-auto">{children}</section>
    </main>
  );
}
