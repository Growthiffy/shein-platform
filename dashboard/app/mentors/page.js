"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Mentors() {
  const [items, setItems] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [f, setF] = useState({ name: "", title: "", bio: "", avatar: "" });

  async function load() {
    const [m, a] = await Promise.all([
      api("/api/admin/mentors"),
      api("/api/admin/admins").catch(() => ({ items: [] })),
    ]);
    setItems(m.items);
    setAdmins(a.items || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.name.trim()) return alert("Name required");
    await api("/api/admin/mentors", { method: "POST", body: f });
    setF({ name: "", title: "", bio: "", avatar: "" }); await load();
  }
  async function del(m) { if (confirm(`Delete mentor "${m.name}"? Members on this mentor are unassigned.`)) { await api(`/api/admin/mentors/${m._id}`, { method: "DELETE" }); await load(); } }
  async function assign(m, ownerId) { await api(`/api/admin/mentors/${m._id}/owner`, { method: "PATCH", body: { ownerId: ownerId || null } }); await load(); }
  async function toggleActive(m) { await api(`/api/admin/mentors/${m._id}`, { method: "PATCH", body: { active: !m.active } }); await load(); }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-1">Mentors</h1>
      <p className="text-cream/50 text-sm mb-4">Each mentor is a persona members can pick. Assign an admin as its owner so they reply to that mentor&apos;s members as a real human in <b>My Juniors</b>. One admin can own several mentors.</p>

      <div className="card p-4 grid grid-cols-5 gap-2 mb-4 items-end">
        <input placeholder="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input placeholder="title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <input placeholder="bio" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
        <input placeholder="avatar URL" value={f.avatar} onChange={e => setF({ ...f, avatar: e.target.value })} />
        <button className="btn" onClick={add}>Add mentor</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead><tr className="text-cream/60 text-left"><th className="p-2">Mentor</th><th className="p-2">Title</th><th className="p-2">Members</th><th className="p-2">Owner (admin)</th><th className="p-2">Active</th><th className="p-2"></th></tr></thead>
          <tbody>
            {items.map(m => (
              <tr key={m._id} className="border-t border-line align-middle">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {m.avatar ? <img src={m.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="h-8 w-8 rounded-full bg-gold/20 grid place-items-center text-gold text-xs">{(m.name || "?").charAt(0)}</span>}
                    <span className="text-cream font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="p-2 text-cream/70">{m.title || "—"}</td>
                <td className="p-2 text-cream/70">{m.menteeCount ?? 0}</td>
                <td className="p-2">
                  <select value={m.owner || ""} onChange={e => assign(m, e.target.value)} className="min-w-[140px]">
                    <option value="">— auto-reply only —</option>
                    {admins.map(a => <option key={a._id} value={a._id}>{a.username || a.email}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <button onClick={() => toggleActive(m)} className={`text-xs px-2 py-1 rounded ${m.active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-cream/50"}`}>{m.active ? "Active" : "Hidden"}</button>
                </td>
                <td className="p-2 text-right"><button className="btn-ghost" onClick={() => del(m)}>Delete</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={6} className="p-4 text-cream/50">No mentors yet. Add one above.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
