"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Tx() {
  const [items, setItems] = useState([]);
  async function load() { setItems((await api("/api/admin/tx")).items); }
  useEffect(() => { load(); }, []);
  async function act(id, kind) { await api(`/api/admin/tx/${id}/${kind}`, { method: "POST" }); await load(); }
  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Transactions</h1>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr className="text-cream/60"><th>Date</th><th>User</th><th>Type</th><th>Amount</th><th>Chain</th><th>Slip</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map(t => (
              <tr key={t._id}>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>{t.user?.email || "—"}</td>
                <td>{t.type}</td><td>${t.amount}</td><td>{t.chain || "-"}</td>
                <td>{t.slipUrl ? <a href={t.slipUrl} target="_blank" rel="noreferrer" className="text-gold underline">view</a> : "-"}</td>
                <td>{t.status}</td>
                <td>
                  {t.status === "pending" && (
                    <div className="flex gap-2">
                      <button className="btn" onClick={() => act(t._id, "approve")}>Approve</button>
                      <button className="btn-ghost" onClick={() => act(t._id, "reject")}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
