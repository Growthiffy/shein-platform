"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Mentors() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ name: "", title: "", bio: "", avatar: "" });
  async function load() { setItems((await api("/api/admin/mentors")).items); }
  useEffect(() => { load(); }, []);
  async function add() { await api("/api/admin/mentors", { method: "POST", body: f }); setF({ name: "", title: "", bio: "", avatar: "" }); await load(); }
  async function del(m) { if (confirm("Delete?")) { await api(`/api/admin/mentors/${m._id}`, { method: "DELETE" }); await load(); } }
  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Mentors</h1>
      <div className="card p-4 grid grid-cols-4 gap-2 mb-4 items-end">
        <input placeholder="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input placeholder="title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <input placeholder="bio" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
        <button className="btn" onClick={add}>Add</button>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr className="text-cream/60"><th>Name</th><th>Title</th><th>Bio</th><th></th></tr></thead>
          <tbody>
            {items.map(m => (
              <tr key={m._id}><td>{m.name}</td><td>{m.title}</td><td>{m.bio}</td>
                <td><button className="btn-ghost" onClick={() => del(m)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
