"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Users() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  async function load() { setItems((await api("/api/admin/users")).items); }
  useEffect(() => { load(); }, []);

  async function save(patch) {
    await api(`/api/admin/users/${sel._id}`, { method: "PATCH", body: patch });
    await load();
  }
  async function force(profitPct) {
    await api(`/api/admin/users/${sel._id}/force-product`, { method: "POST", body: { profitPct } });
    await load(); alert("Next product profit % forced to " + profitPct);
  }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Users</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="card overflow-x-auto col-span-2">
          <table>
            <thead><tr className="text-cream/60"><th>Email</th><th>Username</th><th>Balance</th><th>Level</th><th>Verified</th></tr></thead>
            <tbody>
              {items.map(u => (
                <tr key={u._id} className="cursor-pointer hover:bg-white/5" onClick={() => setSel(u)}>
                  <td>{u.email}</td><td>{u.username || "-"}</td><td>${u.balance?.toFixed(2)}</td>
                  <td>{u.level}</td><td>{u.emailVerified ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          {!sel ? <div className="text-cream/60">Select a user.</div> : (
            <div className="space-y-2">
              <div className="text-gold">{sel.email}</div>
              <Field label="Balance" value={sel.balance} onSave={v => save({ balance: Number(v) })} />
              <Field label="Daily Salary" value={sel.dailySalary} onSave={v => save({ dailySalary: Number(v) })} />
              <Field label="Level" value={sel.level} onSave={v => save({ level: v })} />
              <div>
                <div className="text-xs text-cream/60 mt-2">Force next product profit %</div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => force(-5)}>-5%</button>
                  <button className="btn-ghost" onClick={() => force(0)}>0%</button>
                  <button className="btn-ghost" onClick={() => force(23)}>23%</button>
                  <button className="btn-ghost" onClick={() => force(35)}>35%</button>
                </div>
              </div>
              <label className="flex items-center gap-2 mt-2 text-sm">
                <input type="checkbox" checked={!!sel.isAdmin} onChange={e => save({ isAdmin: e.target.checked })} /> admin
              </label>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, value, onSave }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cream/60 w-28">{label}</span>
      <input value={v} onChange={e => setV(e.target.value)} className="flex-1" />
      <button className="btn" onClick={() => onSave(v)}>Save</button>
    </div>
  );
}
