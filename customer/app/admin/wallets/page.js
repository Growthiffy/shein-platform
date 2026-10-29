"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/AdminShell";
import { adminApi as api } from "@/components/AdminShell";

export default function Wallets() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ chain: "", address: "", label: "", active: true });
  async function load() { setItems((await api("/api/admin/deposit-wallets")).items); }
  useEffect(() => { load(); }, []);
  async function add() { await api("/api/admin/deposit-wallets", { method: "POST", body: f }); setF({ chain: "", address: "", label: "", active: true }); await load(); }
  async function toggle(w) { await api(`/api/admin/deposit-wallets/${w._id}`, { method: "PATCH", body: { active: !w.active } }); await load(); }
  async function del(w) { if (confirm("Delete?")) { await api(`/api/admin/deposit-wallets/${w._id}`, { method: "DELETE" }); await load(); } }
  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Deposit Wallets</h1>
      <div className="card p-4 grid grid-cols-4 gap-2 mb-4 items-end">
        <input placeholder="chain" value={f.chain} onChange={e => setF({ ...f, chain: e.target.value })} />
        <input placeholder="address" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
        <input placeholder="label" value={f.label} onChange={e => setF({ ...f, label: e.target.value })} />
        <button className="btn" onClick={add}>Add</button>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr className="text-cream/60"><th>Chain</th><th>Address</th><th>Label</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {items.map(w => (
              <tr key={w._id}>
                <td>{w.chain}</td><td className="break-all">{w.address}</td><td>{w.label}</td>
                <td><button className="btn-ghost" onClick={() => toggle(w)}>{w.active ? "on" : "off"}</button></td>
                <td><button className="btn-ghost" onClick={() => del(w)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
