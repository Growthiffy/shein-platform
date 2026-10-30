"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { LEVELS, PROFIT_ADJUSTMENTS } from "@/lib/constants";

export default function Users() {
  const [items, setItems] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const [logins, setLogins] = useState([]);
  async function load() { const d = await api("/api/admin/users"); setItems(d.items); if (sel) setSel(d.items.find(u => u._id === sel._id) || null); }
  useEffect(() => { load(); api("/api/admin/mentors").then(d => setMentors(d.items)).catch(() => {}); }, []);

  function select(u) { setSel(u); setLogins([]); api(`/api/admin/users/${u._id}/logins`).then(d => setLogins(d.items)).catch(() => {}); }

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
  async function setVerify(level) {
    await api(`/api/admin/users/${sel._id}/verify`, { method: "POST", body: { level } });
    await load();
  }
  async function notify() {
    const text = prompt("Notification message to send to this user:");
    if (!text?.trim()) return;
    await api(`/api/admin/users/${sel._id}/notify`, { method: "POST", body: { text: text.trim(), type: "info" } });
    alert("Notification sent.");
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl text-gold font-display">Members</h1>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search email / username / #" className="w-64 text-sm" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="card overflow-x-auto col-span-2">
          <table>
            <thead><tr className="text-cream/60"><th>Member #</th><th>Email</th><th>Username</th><th>Balance</th><th>Level</th><th>Cycle</th><th>Verified</th></tr></thead>
            <tbody>
              {items.filter(u => {
                const s = q.trim().toLowerCase();
                if (!s) return true;
                return (u.email || "").toLowerCase().includes(s) || (u.username || "").toLowerCase().includes(s) || String(u.accountNumber || "").includes(s);
              }).map(u => (
                <tr key={u._id} className="cursor-pointer hover:bg-black/[0.03]" onClick={() => select(u)}>
                  <td className="text-cream/50">{u.accountNumber ?? "—"}</td>
                  <td>{u.email}</td><td>{u.username || "-"}</td>
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
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream/50">
                {sel.accountNumber != null && <span>Member #{sel.accountNumber}</span>}
                {sel.referralCode && <span>Code <b className="text-gold font-mono">{sel.referralCode}</b></span>}
                <span>Credit {sel.creditScore ?? 100}%</span>
              </div>

              <NumField label="Balance $" value={sel.balance} onSave={v => save({ balance: Number(v) })} />
              <NumField label="Daily Salary $" value={sel.dailySalary} onSave={v => save({ dailySalary: Number(v) })} />
              <NumField label="Credit Score" value={sel.creditScore ?? 100} onSave={v => save({ creditScore: Number(v) })} />
              <TextField label="Phone" value={sel.phone || ""} onSave={v => save({ phone: v })} />

              <SelectField label="Level" value={sel.level} options={LEVELS.map(l => ({ v: l.key, t: l.name }))} onSave={v => save({ level: v })} />

              <SelectField label="Mentor" value={sel.mentor || ""}
                options={[{ v: "", t: "— none —" }, ...mentors.map(m => ({ v: m._id, t: m.name }))]}
                onSave={v => save({ mentor: v || null })} />

              <SelectField label="Verification" value={sel.verification?.level || "none"}
                options={[{ v: "none", t: "None" }, { v: "basic", t: "Basic" }, { v: "standard", t: "Standard" }, { v: "pending_premium", t: "Premium (pending)" }, { v: "premium", t: "Premium" }]}
                onSave={setVerify} />
              {sel.verification?.level === "pending_premium" && (
                <div className="text-xs text-amber-600">ID submitted ({sel.verification?.idType || "id"}) — approve to Premium.</div>
              )}

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

              <div className="flex flex-wrap gap-2 pt-2">
                <button className="btn-ghost text-xs" onClick={resetCycle}>Reset Cycle</button>
                <button className="btn-ghost text-xs" onClick={() => adjust(0)}>Adjust Balance</button>
                <button className="btn-ghost text-xs" onClick={notify}>Send Notification</button>
              </div>

              <label className="flex items-center gap-2 text-sm mt-2">
                <input type="checkbox" checked={!!sel.emailVerified} onChange={e => save({ emailVerified: e.target.checked })} /> email verified
              </label>

              <div className="pt-3 border-t border-line">
                <div className="text-xs text-cream/60 mb-1">Login history</div>
                <div className="max-h-48 overflow-y-auto divide-y divide-black/[0.06]">
                  {logins.map(l => (
                    <div key={l._id} className="py-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-cream">{l.ip || "unknown IP"}</span><span className="text-cream/40">{new Date(l.createdAt).toLocaleString()}</span></div>
                      <div className="text-cream/40 truncate">{l.userAgent || ""}</div>
                    </div>
                  ))}
                  {!logins.length && <div className="text-cream/40 text-xs py-2">No logins recorded.</div>}
                </div>
              </div>
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

function TextField({ label, value, onSave }) {
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
