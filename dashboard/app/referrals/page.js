"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Referrals() {
  const [items, setItems] = useState([]);
  useEffect(() => { api("/api/admin/referrals").then(d => setItems(d.items)).catch(() => {}); }, []);
  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4 font-display">Referrals</h1>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Referrer</th><th>Code</th><th>Invited</th><th>Verified</th></tr></thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={i}>
                <td>{r.user?.username || r.user?.email || "—"}</td>
                <td className="font-mono text-gold">{r.user?.code || "—"}</td>
                <td>{r.invited}</td>
                <td className="text-gold">{r.verified}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={4} className="text-cream/50">No referrals yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
