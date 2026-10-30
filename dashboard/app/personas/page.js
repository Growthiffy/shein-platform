"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const BLANK = { name: "", title: "", avatar: "", group: "both", canReply: false, active: true };

export default function Personas() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [msg, setMsg] = useState("");

  async function load() { setItems((await api("/api/admin/personas")).items); }
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg("");
    if (!form.name.trim()) { setMsg("name required"); return; }
    try { await api("/api/admin/personas", { method: "POST", body: form }); setForm(BLANK); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function patch(id, body) { await api(`/api/admin/personas/${id}`, { method: "PATCH", body }); await load(); }
  async function remove(id) { if (!confirm("Delete this persona?")) return; await api(`/api/admin/personas/${id}`, { method: "DELETE" }); await load(); }
  async function topUp() {
    setMsg("Generating…");
    try { const d = await api("/api/admin/personas/seed", { method: "POST", body: { target: 400 } }); setMsg(`Added ${d.added}. Total ${d.total}.`); await load(); }
    catch (e) { setMsg(e.message); }
  }
  async function rebuild() {
    if (!confirm("Rebuild ALL personas as 400 with unique names + unique avatars? This replaces every existing persona.")) return;
    setMsg("Rebuilding…");
    try { const d = await api("/api/admin/personas/seed", { method: "POST", body: { target: 400, reset: true } }); setMsg(`Rebuilt. Total ${d.total} (all unique).`); await load(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl text-gold">Personas <span className="text-cream/40 text-base">({items.length})</span></h1>
        <div className="flex gap-2">
          <button className="btn" onClick={topUp}>Generate 400 personas</button>
          <button className="btn-ghost" onClick={rebuild}>Rebuild 400 unique</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="card overflow-x-auto col-span-2">
          <table>
            <thead><tr className="text-cream/60"><th>Name</th><th>Title</th><th>Group</th><th>Replies</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {items.map(p => (
                <tr key={p._id}>
                  <td>{p.name}</td><td>{p.title || "-"}</td><td>{p.group}</td>
                  <td><input type="checkbox" checked={!!p.canReply} onChange={e => patch(p._id, { canReply: e.target.checked })} /></td>
                  <td><input type="checkbox" checked={!!p.active} onChange={e => patch(p._id, { active: e.target.checked })} /></td>
                  <td><button className="btn-ghost text-xs" onClick={() => remove(p._id)}>Delete</button></td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={6} className="text-cream/50">No personas yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card p-4 space-y-3">
          <div className="text-gold">Add persona</div>
          <Field label="Name"   value={form.name}   onChange={v => setForm({ ...form, name: v })} />
          <Field label="Title"  value={form.title}  onChange={v => setForm({ ...form, title: v })} />
          <Field label="Avatar URL" value={form.avatar} onChange={v => setForm({ ...form, avatar: v })} />
          <label className="text-sm block">Group
            <select className="w-full mt-1" value={form.group} onChange={e => setForm({ ...form, group: e.target.value })}>
              {["daily", "invest", "both"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.canReply} onChange={e => setForm({ ...form, canReply: e.target.checked })} /> can reply
          </label>
          <button className="btn w-full" onClick={create}>Create</button>
          {msg && <div className="text-cream/60 text-sm">{msg}</div>}
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="text-sm block">{label}
      <input className="w-full mt-1" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}
