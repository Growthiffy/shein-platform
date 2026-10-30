"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

const TYPES = ["news", "update", "maintenance", "promotion"];
const EMPTY = { title: "", body: "", type: "news", pinned: false, active: true };

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  async function load() { setItems((await api("/api/admin/announcements")).items); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.title.trim()) return alert("Title required");
    if (editId) await api(`/api/admin/announcements/${editId}`, { method: "PATCH", body: form });
    else await api("/api/admin/announcements", { method: "POST", body: form });
    setForm(EMPTY); setEditId(null); await load();
  }
  function edit(a) { setEditId(a._id); setForm({ title: a.title, body: a.body || "", type: a.type, pinned: !!a.pinned, active: a.active !== false }); }
  async function toggle(a, patch) { await api(`/api/admin/announcements/${a._id}`, { method: "PATCH", body: patch }); await load(); }
  async function del(a) { if (confirm("Delete?")) { await api(`/api/admin/announcements/${a._id}`, { method: "DELETE" }); await load(); } }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4 font-display">Announcements</h1>

      <div className="card p-4 mb-4 space-y-2 max-w-2xl">
        <div className="text-sm text-gold font-semibold">{editId ? "Edit announcement" : "New announcement"}</div>
        <input className="w-full" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <textarea className="w-full" rows={3} placeholder="Body" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
        <div className="flex flex-wrap items-center gap-3">
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} /> pinned</label>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> active</label>
          <button className="btn" onClick={save}>{editId ? "Update" : "Create"}</button>
          {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table>
          <thead><tr className="text-cream/60"><th>Title</th><th>Type</th><th>Published</th><th>Pinned</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {items.map(a => (
              <tr key={a._id}>
                <td>{a.title}</td>
                <td>{a.type}</td>
                <td>{new Date(a.publishedAt).toLocaleDateString()}</td>
                <td><button className="btn-ghost" onClick={() => toggle(a, { pinned: !a.pinned })}>{a.pinned ? "★" : "—"}</button></td>
                <td><button className="btn-ghost" onClick={() => toggle(a, { active: !a.active })}>{a.active ? "on" : "off"}</button></td>
                <td className="whitespace-nowrap">
                  <button className="btn-ghost" onClick={() => edit(a)}>Edit</button>
                  <button className="btn-ghost" onClick={() => del(a)}>Delete</button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="text-cream/50 py-4">No announcements yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
