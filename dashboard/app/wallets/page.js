"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { CHAINS } from "@/lib/constants";

export default function Wallets() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ chain: CHAINS[0], address: "", label: "", active: true });
  async function load() { setItems((await api("/api/admin/deposit-wallets")).items); }
  useEffect(() => { load(); }, []);
  async function add() {
    if (!f.address) return alert("Address required");
    await api("/api/admin/deposit-wallets", { method: "POST", body: f });
    setF({ chain: CHAINS[0], address: "", label: "", active: true });
    await load();
  }
  async function toggle(w) { await api(`/api/admin/deposit-wallets/${w._id}`, { method: "PATCH", body: { active: !w.active } }); await load(); }
  async function del(w) { if (confirm("Delete?")) { await api(`/api/admin/deposit-wallets/${w._id}`, { method: "DELETE" }); await load(); } }
  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Deposit Wallets</h1>
      <div className="card p-4 grid grid-cols-4 gap-2 mb-4 items-end">
        <L label="Chain">
          <select value={f.chain} onChange={e => setF({ ...f, chain: e.target.value })} className="w-full">
            {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </L>
        <L label="Address"><input placeholder="wallet address" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} className="w-full" /></L>
        <L label="Label"><input placeholder="e.g. Primary" value={f.label} onChange={e => setF({ ...f, label: e.target.value })} className="w-full" /></L>
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
function L({ label, children }) { return <label className="text-sm block"><div className="text-xs text-cream/60">{label}</div>{children}</label>; }
