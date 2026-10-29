"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/tx", label: "Transactions" },
  { href: "/admin/wallets", label: "Deposit Wallets" },
  { href: "/admin/mentors", label: "Mentors" },
  { href: "/admin/community", label: "Community" },
];

export function getAdminToken() { if (typeof window === "undefined") return null; return localStorage.getItem("shein_admin_token"); }
export function setAdminToken(t) { if (t) localStorage.setItem("shein_admin_token", t); else localStorage.removeItem("shein_admin_token"); }

export async function adminApi(path, opts = {}) {
  const t = getAdminToken();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}

export default function Shell({ children }) {
  const p = usePathname();
  const r = useRouter();
  useEffect(() => { if (!getAdminToken()) r.push("/admin"); }, []);
  return (
    <main className="min-h-screen flex bg-ink text-cream">
      <aside className="w-56 border-r border-gold/10 p-4 space-y-1">
        <div className="text-xl text-gold mb-4 font-display">SHEIN · Admin</div>
        {NAV.map(n => (
          <Link key={n.href} href={n.href}
            className={`block px-3 py-2 rounded ${p.startsWith(n.href) ? "bg-gold/20 text-gold" : "hover:bg-white/5"}`}>
            {n.label}
          </Link>
        ))}
        <button onClick={() => { setAdminToken(null); r.push("/admin"); }} className="btn-ghost mt-6 w-full">Sign Out</button>
      </aside>
      <section className="flex-1 p-6 overflow-x-auto">{children}</section>
    </main>
  );
}
