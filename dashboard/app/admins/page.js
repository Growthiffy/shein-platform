"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { ShieldCheck, Trash2 } from "lucide-react";

export default function Admins() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [msg, setMsg] = useState("");

  async function load() { setItems((await api("/api/admin/admins")).items); }
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg("");
    try { await api("/api/admin/admins", { method: "POST", body: form }); setForm({ email: "", username: "", password: "" }); setMsg("operator created ✓"); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function remove(id) {
    if (!confirm("Remove this admin operator?")) return;
    try { await api(`/api/admin/admins/${id}`, { method: "DELETE" }); await load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-1"><ShieldCheck size={20} className="text-gold" /><h1 className="text-2xl text-gold font-display">Admin Operators</h1></div>
      <p className="text-cream/50 text-sm mb-5">Backend operators — separate from members. They have no wallet, salary, or analyst access.</p>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card overflow-x-auto lg:col-span-2">
          <table>
            <thead><tr><th>Email</th><th>Username</th><th>Since</th><th></th></tr></thead>
            <tbody>
              {items.map(a => (
                <tr key={a._id}>
                  <td>{a.email}</td><td>{a.username || "—"}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td><button className="btn-ghost text-xs" onClick={() => remove(a._id)}><Trash2 size={13} /></button></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={4} className="text-cream/50">No operators.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card p-4 space-y-3 h-max">
          <div className="text-gold">Add operator</div>
          <label className="text-sm block">Email<input className="w-full mt-1" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label className="text-sm block">Username<input className="w-full mt-1" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
          <label className="text-sm block">Password (min 8)<input type="password" className="w-full mt-1" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <button className="btn w-full" onClick={create}>Create operator</button>
          {msg && <div className="text-cream/60 text-sm">{msg}</div>}
        </div>
      </div>
    </Shell>
  );
}
