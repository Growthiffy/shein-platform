"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { LEVELS, PROFIT_ADJUSTMENTS } from "@/lib/constants";

const CUSTOMER_BASE = process.env.NEXT_PUBLIC_CUSTOMER_URL || "https://shein-customer.vercel.app";

export default function Users() {
  const [items, setItems] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [sel, setSel] = useState(null);     // list row
  const [detail, setDetail] = useState(null); // full detail from GET /users/:id
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [note, setNote] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    try {
      const d = await api(`/api/admin/users${params.toString() ? "?" + params : ""}`);
      setItems(d.items);
      if (sel) { const row = d.items.find(u => u._id === sel._id); if (row) setSel(row); }
    } catch {}
  }
  useEffect(() => { load(); api("/api/admin/mentors").then(d => setMentors(d.items)).catch(() => {}); }, [status]);

  async function select(u) {
    setSel(u); setDetail(null); setNote("");
    try { setDetail(await api(`/api/admin/users/${u._id}`)); } catch {}
  }
  async function refresh() {
    await load();
    if (sel) { try { setDetail(await api(`/api/admin/users/${sel._id}`)); } catch {} }
  }

  // Generic helpers ---------------------------------------------------------
  async function save(patch) {
    setNote("");
    try { await api(`/api/admin/users/${sel._id}`, { method: "PATCH", body: patch }); await refresh(); setNote("saved ✓"); }
    catch (e) { setNote(e.message); }
  }
  async function act(path, body, confirmMsg, okMsg) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setNote("");
    try { const r = await api(`/api/admin/users/${sel._id}${path}`, { method: "POST", body }); await refresh(); if (okMsg) setNote(okMsg); return r; }
    catch (e) { setNote(e.message); }
  }

  // Specific actions --------------------------------------------------------
  const resetCycle = () => act("/reset-cycle", {}, "Reset analyst cycle to 0?", "cycle reset");
  const adjustBalance = () => { const n = Number(prompt("Adjust balance (positive credits, negative debits):", "0")); if (!n && n !== 0) return; act("/adjust-balance", { amount: n, note: "admin adjust" }, null, `adjusted $${n}`); };
  const adjustNext = (p) => act("/adjust-next-product", { profitPct: p }, null, `next product +${p}%`);
  const setVerify = (level) => act("/verification", { level }, null, "verification set");
  const sendNotify = () => { const text = prompt("Notification to this member:"); if (!text?.trim()) return; act("/notify", { text: text.trim(), type: "info" }, null, "notification sent"); };
  const resetPassword = () => { const pw = prompt("New password (min 8 chars):"); if (!pw) return; if (pw.length < 8) { setNote("password must be at least 8 characters"); return; } act("/password", { password: pw }, "Reset this member's password? It signs them out everywhere.", "password reset"); };
  const forceLogout = () => act("/force-logout", {}, "Sign this member out of all devices?", "signed out everywhere");
  const disable2FA = () => act("/2fa-disable", {}, "Disable this member's 2FA?", "2FA disabled");
  const clearNotifs = () => act("/notifications/clear", {}, "Clear all notifications for this member?", "notifications cleared");
  const toggleSuspend = () => {
    const suspend = !sel.suspended;
    const reason = suspend ? (prompt("Reason for suspension:", "Policy review") || "Suspended by admin") : undefined;
    act("/suspend", { suspended: suspend, reason }, suspend ? "Suspend this member? They can't log in until reactivated." : "Reactivate this member?", suspend ? "suspended" : "reactivated");
  };
  const setInvestment = () => {
    const tier = Number(prompt("Investment tier (1-7, 0 to clear):", String(sel.investment?.tier || 0)));
    if (Number.isNaN(tier)) return;
    if (tier <= 0) return act("/investment", { clear: true }, "Clear this member's investment?", "investment cleared");
    const amount = Number(prompt("Principal amount $:", String(sel.investment?.amount || 0)));
    if (!Number.isFinite(amount)) return;
    act("/investment", { tier, amount }, null, "investment set");
  };
  const walletAction = (idx, action) => act(`/payout-wallet/${idx}`, { action }, action === "remove" ? "Remove this payout wallet?" : null, action === "remove" ? "wallet removed" : "hold cleared");
  async function loginAs() {
    const r = await act("/login-as", {}, "Open this member's account view in the member app?");
    if (r?.token) window.open(`${CUSTOMER_BASE}/auth?as=${encodeURIComponent(r.token)}`, "_blank", "noopener");
  }
  async function del() {
    if (!confirm(`PERMANENTLY delete ${sel.email || sel.username}? This removes their transactions, submissions, chat and logins. Cannot be undone.`)) return;
    if (!confirm("Are you absolutely sure? This is irreversible.")) return;
    try { await api(`/api/admin/users/${sel._id}`, { method: "DELETE" }); setSel(null); setDetail(null); await load(); }
    catch (e) { setNote(e.message); }
  }

  const u = sel;
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl text-gold font-display">Members</h1>
        <div className="flex gap-2">
          <select value={status} onChange={e => setStatus(e.target.value)} className="text-sm">
            <option value="all">All</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </select>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search email / username / #" className="w-56 text-sm" />
          <button className="btn text-sm" onClick={load}>Search</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card overflow-x-auto col-span-2 max-h-[80vh]">
          <table>
            <thead><tr className="text-cream/60"><th>#</th><th>Email</th><th>Username</th><th>Balance</th><th>Level</th><th>Cycle</th><th>Status</th></tr></thead>
            <tbody>
              {items.map(r => (
                <tr key={r._id} className={`cursor-pointer hover:bg-black/[0.03] ${sel?._id === r._id ? "bg-gold/10" : ""}`} onClick={() => select(r)}>
                  <td className="text-cream/50">{r.accountNumber ?? "—"}</td>
                  <td className="break-all">{r.email}</td><td>{r.username || "-"}</td>
                  <td>${(r.balance ?? 0).toFixed(2)}</td>
                  <td>{r.level}</td><td>{r.analyst?.cycleCount ?? 0}/27</td>
                  <td>{r.suspended ? <span className="rounded-full bg-red-500/15 text-red-500 text-[10px] px-2 py-0.5">SUSPENDED</span> : <span className="text-emerald-500 text-xs">active</span>}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={7} className="text-cream/50 py-4">No members.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card p-4 max-h-[80vh] overflow-y-auto">
          {!u ? <div className="text-cream/60">Select a member.</div> : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-gold break-all">{u.email}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-cream/50 mt-0.5">
                    {u.accountNumber != null && <span>#{u.accountNumber}</span>}
                    {u.referralCode && <span>Code <b className="text-gold font-mono">{u.referralCode}</b></span>}
                    <span>Credit {u.creditScore ?? 100}%</span>
                    {detail && <span>{detail.submissions} analyses · {detail.referrals} refs</span>}
                  </div>
                </div>
                {u.suspended && <span className="shrink-0 rounded-full bg-red-500/15 text-red-500 text-[10px] px-2 py-0.5">SUSPENDED</span>}
              </div>
              {note && <div className="text-xs text-cream/70 bg-black/[0.04] rounded px-2 py-1">{note}</div>}

              {/* identity + money */}
              <TextField label="Username" value={u.username || ""} onSave={v => save({ username: v })} />
              <TextField label="Email" value={u.email || ""} onSave={v => save({ email: v })} />
              <TextField label="Phone" value={u.phone || ""} onSave={v => save({ phone: v })} />
              <NumField label="Balance $" value={u.balance} onSave={v => save({ balance: Number(v) })} />
              <NumField label="Total Earned $" value={u.totalEarned} onSave={v => save({ totalEarned: Number(v) })} />
              <NumField label="Reward Credit $" value={u.rewardCredit} onSave={v => save({ rewardCredit: Number(v) })} />
              <NumField label="Daily Salary $" value={u.dailySalary} onSave={v => save({ dailySalary: Number(v) })} />
              <NumField label="Credit Score" value={u.creditScore ?? 100} onSave={v => save({ creditScore: Number(v) })} />

              <SelectField label="Level" value={u.level} options={LEVELS.map(l => ({ v: l.key, t: l.name }))} onSave={v => save({ level: v })} />
              <SelectField label="Mentor" value={u.mentor || ""} options={[{ v: "", t: "— none —" }, ...mentors.map(m => ({ v: m._id, t: m.name }))]} onSave={v => save({ mentor: v || null })} />
              <SelectField label="Verification" value={u.verification?.level || "none"}
                options={[{ v: "none", t: "None" }, { v: "basic", t: "Basic" }, { v: "standard", t: "Standard" }, { v: "pending_premium", t: "Premium (pending)" }, { v: "premium", t: "Premium" }]}
                onSave={setVerify} />
              {u.verification?.level === "pending_premium" && <div className="text-xs text-amber-600">ID submitted ({u.verification?.idType || "id"}) — approve to Premium.</div>}

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!u.emailVerified} onChange={e => save({ emailVerified: e.target.checked })} /> email verified</label>

              {/* community access */}
              <div className="pt-1">
                <div className="text-xs text-cream/60">Community access</div>
                {["daily", "invest", "mentorRooms"].map(k => (
                  <label key={k} className="flex items-center gap-2 text-sm mt-1">
                    <input type="checkbox" checked={u.communityAccess?.[k] !== false}
                      onChange={e => save({ communityAccess: { ...(u.communityAccess || {}), [k]: e.target.checked } })} />
                    {k === "mentorRooms" ? "Mentor rooms" : k === "invest" ? "Invest chat" : "Daily chat"}
                  </label>
                ))}
              </div>

              {/* investment */}
              <div className="pt-1 text-sm">
                <div className="text-xs text-cream/60">Investment</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-cream/70">{u.investment?.amount ? `Tier ${u.investment.tier} · $${u.investment.amount}` : "none"}</span>
                  <button className="btn-ghost text-xs" onClick={setInvestment}>Set / clear</button>
                </div>
              </div>

              {/* payout wallets */}
              {!!(u.payoutWallets && u.payoutWallets.length) && (
                <div className="pt-1">
                  <div className="text-xs text-cream/60">Payout wallets</div>
                  <div className="mt-1 space-y-1">
                    {u.payoutWallets.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="flex-1 truncate">{w.chain} · {w.address} {w.active === false && <span className="text-amber-600">(hold)</span>}</span>
                        {w.active === false && <button className="btn-ghost text-[11px]" onClick={() => walletAction(i, "clear-hold")}>clear hold</button>}
                        <button className="btn-ghost text-[11px]" onClick={() => walletAction(i, "remove")}>remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* next-product adjustment */}
              <div className="pt-1">
                <div className="text-xs text-cream/60">Next product profit %</div>
                <div className="flex flex-wrap gap-1 mt-1">{PROFIT_ADJUSTMENTS.map(p => <button key={p} className="btn-ghost text-xs" onClick={() => adjustNext(p)}>{p}%</button>)}</div>
              </div>

              {/* action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                <button className="btn-ghost text-xs" onClick={resetCycle}>Reset Cycle</button>
                <button className="btn-ghost text-xs" onClick={adjustBalance}>Adjust Balance</button>
                <button className="btn-ghost text-xs" onClick={sendNotify}>Notify</button>
                <button className="btn-ghost text-xs" onClick={clearNotifs}>Clear Notifs</button>
                <button className="btn-ghost text-xs" onClick={resetPassword}>Reset Password</button>
                <button className="btn-ghost text-xs" onClick={forceLogout}>Force Logout</button>
                <button className="btn-ghost text-xs" onClick={disable2FA}>Disable 2FA</button>
                <button className="btn-ghost text-xs" onClick={loginAs}>Login as</button>
                <button className={`btn-ghost text-xs ${u.suspended ? "text-emerald-500" : "text-amber-600"}`} onClick={toggleSuspend}>{u.suspended ? "Reactivate" : "Suspend"}</button>
                <button className="btn-ghost text-xs text-red-500" onClick={del}>Delete</button>
              </div>

              {/* recent transactions */}
              {detail && (
                <div className="pt-3 border-t border-line">
                  <div className="text-xs text-cream/60 mb-1">Recent transactions</div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-black/[0.06]">
                    {detail.transactions.slice(0, 20).map(t => (
                      <div key={t._id} className="py-1 flex justify-between text-xs">
                        <span className="text-cream">{t.type} <span className="text-cream/40">{t.status}</span></span>
                        <span className="text-cream/70">${t.amount} · {new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {!detail.transactions.length && <div className="text-cream/40 text-xs py-2">No transactions.</div>}
                  </div>
                </div>
              )}

              {/* login history */}
              {detail && (
                <div className="pt-3 border-t border-line">
                  <div className="text-xs text-cream/60 mb-1">Login history</div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-black/[0.06]">
                    {detail.logins.map(l => (
                      <div key={l._id} className="py-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-cream">{l.ip || "unknown IP"}</span><span className="text-cream/40">{new Date(l.createdAt).toLocaleString()}</span></div>
                        <div className="text-cream/40 truncate">{l.userAgent || ""}</div>
                      </div>
                    ))}
                    {!detail.logins.length && <div className="text-cream/40 text-xs py-2">No logins recorded.</div>}
                  </div>
                </div>
              )}
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
