"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function InboxPage() {
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState("");
  async function load() { setItems((await api(`/api/admin/contact${kind ? "?kind=" + kind : ""}`)).items || []); }
  useEffect(() => { load(); }, [kind]);
  async function handled(id, v) { await api(`/api/admin/contact/${id}/handled`, { method: "POST", body: { handled: v } }); await load(); }
  async function del(id) { if (confirm("Delete?")) { await api(`/api/admin/contact/${id}`, { method: "DELETE" }); await load(); } }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl text-gold font-display">Inbox</h1>
        <select value={kind} onChange={e => setKind(e.target.value)} className="text-sm">
          <option value="">All</option><option value="contact">Contact</option><option value="newsletter">Newsletter</option>
        </select>
      </div>
      <div className="card divide-y divide-line">
        {items.map(m => (
          <div key={m._id} className={`p-3 ${m.handled ? "opacity-55" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="chip mr-2">{m.kind}</span>
                <b className="text-cream">{m.name || m.email || "—"}</b> <span className="text-cream/45 text-xs">{m.email}</span>
                <span className="text-cream/35 text-xs ml-2">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="btn-ghost text-xs" onClick={() => handled(m._id, !m.handled)}>{m.handled ? "Reopen" : "Mark handled"}</button>
                <button className="btn-ghost text-xs text-red-500" onClick={() => del(m._id)}>Delete</button>
              </div>
            </div>
            {m.message && <div className="text-sm text-cream/75 mt-1 whitespace-pre-wrap break-words">{m.message}</div>}
          </div>
        ))}
        {!items.length && <div className="p-6 text-cream/50 text-sm">No submissions.</div>}
      </div>
    </Shell>
  );
}
