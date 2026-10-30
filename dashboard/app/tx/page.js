"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TYPES = ["", "deposit", "withdrawal", "commission", "salary", "invest_payout", "invest_lock", "invest_release", "reward", "adjustment"];
const STATUSES = ["", "pending", "approved", "rejected", "complete"];

export default function Tx() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  async function load() {
    const qs = new URLSearchParams();
    if (type) qs.set("type", type);
    if (status) qs.set("status", status);
    setItems((await api(`/api/admin/tx${qs.toString() ? "?" + qs : ""}`)).items);
  }
  useEffect(() => { load(); }, [type, status]);
  async function act(id, kind) { await api(`/api/admin/tx/${id}/${kind}`, { method: "POST" }); await load(); }
  async function stage(id, s) { await api(`/api/admin/tx/${id}/stage`, { method: "POST", body: { stage: s } }); await load(); }
  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl text-gold font-display">Transactions</h1>
        <div className="flex gap-2">
          <select value={status} onChange={e => setStatus(e.target.value)} className="text-sm">{STATUSES.map(s => <option key={s} value={s}>{s || "all statuses"}</option>)}</select>
          <select value={type} onChange={e => setType(e.target.value)} className="text-sm">{TYPES.map(t => <option key={t} value={t}>{t || "all types"}</option>)}</select>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr className="text-cream/60"><th>Date</th><th>User</th><th>Type</th><th>Amount</th><th>Chain</th><th>Slip</th><th>Status</th><th>Stage</th><th></th></tr></thead>
          <tbody>
            {items.map(t => {
              const flow = t.type === "deposit" || t.type === "withdrawal";
              const terminal = t.status !== "pending";
              return (
              <tr key={t._id}>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>{t.user?.email || "—"}</td>
                <td>{t.type}</td><td>${t.amount}</td><td>{t.chain || "-"}</td>
                <td>{t.slipUrl ? <a href={t.slipUrl} target="_blank" rel="noreferrer" className="text-gold underline">view</a> : "-"}</td>
                <td>{t.status}</td>
                <td className="text-xs">{flow ? (t.processingStage || "submitted").replace(/_/g, " ") : "-"}</td>
                <td>
                  {flow && !terminal && (
                    <div className="flex flex-wrap gap-1">
                      <button className="btn-ghost" onClick={() => stage(t._id, "under_review")}>Review</button>
                      <button className="btn-ghost" onClick={() => stage(t._id, "processing")}>Processing</button>
                      <button className="btn" onClick={() => stage(t._id, "completed")}>Complete</button>
                      <button className="btn-ghost" onClick={() => stage(t._id, "rejected")}>Reject</button>
                    </div>
                  )}
                  {!flow && t.status === "pending" && (
                    <div className="flex gap-2">
                      <button className="btn" onClick={() => act(t._id, "approve")}>Approve</button>
                      <button className="btn-ghost" onClick={() => act(t._id, "reject")}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
