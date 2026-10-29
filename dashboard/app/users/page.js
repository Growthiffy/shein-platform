"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { LEVELS, PROFIT_ADJUSTMENTS } from "@/lib/constants";

export default function Users() {
  const [items, setItems] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [sel, setSel] = useState(null);
  async function load() { const d = await api("/api/admin/users"); setItems(d.items); if (sel) setSel(d.items.find(u => u._id === sel._id) || null); }
  useEffect(() => { load(); api("/api/admin/mentors").then(d => setMentors(d.items)).catch(() => {}); }, []);

  async function save(patch) {
    await api(`/api/admin/users/${sel._id}`, { method: "PATCH", body: patch });
    await load();
  }
  async function adjustNext(profitPct) {
    await api(`/api/admin/users/${sel._id}/adjust-next-product`, { method: "POST", body: { profitPct } });
    await load(); alert("Next product profit adjustment set to " + profitPct + "%");
  }
  async function resetCycle() {
    if (!confirm("Reset analyst cycle to 0 for this user?")) return;
    await api(`/api/admin/users/${sel._id}/reset-cycle`, { method: "POST" });
    await load();
  }
  async function adjust(amount) {
    const n = Number(prompt("Amount to adjust (positive to credit, negative to debit):", amount));
    if (!n && n !== 0) return;
    await api(`/api/admin/users/${sel._id}/adjust-balance`, { method: "POST", body: { amount: n, note: "admin adjust" } });
    await load();
  }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Users</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="card overflow-x-auto col-span-2">
          <table>
            <thead><tr className="text-cream/60"><th>Email</th><th>Username</th><th>Role</th><th>Balance</th><th>Level</th><th>Cycle</th><th>Verified</th></tr></thead>
            <tbody>
              {items.map(u => (
                <tr key={u._id} className="cursor-pointer hover:bg-white/5" onClick={() => setSel(u)}>
                  <td>{u.email}</td><td>{u.username || "-"}</td>
                  <td>{(u.role || (u.isAdmin ? "admin" : "customer"))}</td>
                  <td>${(u.balance ?? 0).toFixed(2)}</td>
                  <td>{u.level}</td><td>{u.analyst?.cycleCount ?? 0}/27</td><td>{u.emailVerified ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          {!sel ? <div className="text-cream/60">Select a user.</div> : (
            <div className="space-y-3">
              <div className="text-gold break-all">{sel.email}</div>

              <NumField label="Balance $" value={sel.balance} onSave={v => save({ balance: Number(v) })} />
              <NumField label="Daily Salary $" value={sel.dailySalary} onSave={v => save({ dailySalary: Number(v) })} />

              <SelectField label="Level" value={sel.level} options={LEVELS.map(l => ({ v: l.key, t: l.name }))} onSave={v => save({ level: v })} />

              <SelectField label="Mentor" value={sel.mentor || ""}
                options={[{ v: "", t: "— none —" }, ...mentors.map(m => ({ v: m._id, t: m.name }))]}
                onSave={v => save({ mentor: v || null })} />

              <div className="pt-2">
                <div className="text-xs text-cream/60">Community access</div>
                <div className="flex flex-col gap-1 mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sel.communityAccess?.daily !== false}
                      onChange={e => save({ communityAccess: { ...(sel.communityAccess || {}), daily: e.target.checked } })} /> Daily chat
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sel.communityAccess?.invest !== false}
                      onChange={e => save({ communityAccess: { ...(sel.communityAccess || {}), invest: e.target.checked } })} /> Invest chat
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sel.communityAccess?.mentorRooms !== false}
                      onChange={e => save({ communityAccess: { ...(sel.communityAccess || {}), mentorRooms: e.target.checked } })} /> Mentor rooms
                  </label>
                </div>
              </div>

              <div>
                <div className="text-xs text-cream/60 mt-2">Next product profit adjustment %</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {PROFIT_ADJUSTMENTS.map(p => (
                    <button key={p} className="btn-ghost text-xs" onClick={() => adjustNext(p)}>{p}%</button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="btn-ghost text-xs" onClick={resetCycle}>Reset Cycle</button>
                <button className="btn-ghost text-xs" onClick={() => adjust(0)}>Adjust Balance</button>
              </div>

              <label className="flex items-center gap-2 mt-2 text-sm">
                <input type="checkbox" checked={!!sel.isAdmin} onChange={e => save({ isAdmin: e.target.checked })} /> admin
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!sel.emailVerified} onChange={e => save({ emailVerified: e.target.checked })} /> email verified
              </label>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function NumField({ label, value, onSave }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cream/60 w-28">{label}</span>
      <input type="number" value={v} onChange={e => setV(e.target.value)} className="flex-1" />
      <button className="btn" onClick={() => onSave(v)}>Save</button>
    </div>
  );
}

function SelectField({ label, value, options, onSave }) {
  const [v, setV] = useState(value ?? options[0]?.v);
  useEffect(() => setV(value ?? options[0]?.v), [value]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cream/60 w-28">{label}</span>
      <select value={v} onChange={e => setV(e.target.value)} className="flex-1">
        {options.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
      <button className="btn" onClick={() => onSave(v)}>Save</button>
    </div>
  );
}
