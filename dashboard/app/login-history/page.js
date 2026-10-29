"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function LoginHistory() {
  const [items, setItems] = useState([]);
  useEffect(() => { api("/api/admin/login-history").then(d => setItems(d.items)).catch(() => {}); }, []);
  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4 font-display">Login History</h1>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>When</th><th>Member</th><th>Account #</th><th>IP</th><th>Device</th></tr></thead>
          <tbody>
            {items.map(l => (
              <tr key={l._id}>
                <td>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.user?.username || l.user?.email || "—"}</td>
                <td>{l.user?.accountNumber ?? "—"}</td>
                <td>{l.ip || "—"}</td>
                <td className="max-w-xs truncate text-cream/60">{l.userAgent || "—"}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={5} className="text-cream/50">No logins recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
