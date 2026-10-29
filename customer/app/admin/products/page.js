"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/AdminShell";
import { adminApi as api } from "@/components/AdminShell";

export default function Products() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ brand: "", name: "", originalPrice: "", image: "", isLatest: false });
  async function load() { setItems((await api("/api/admin/products")).items); }
  useEffect(() => { load(); }, []);
  async function create() {
    await api("/api/admin/products", { method: "POST", body: { ...form, originalPrice: Number(form.originalPrice) } });
    setForm({ brand: "", name: "", originalPrice: "", image: "", isLatest: false });
    await load();
  }
  async function toggle(p) { await api(`/api/admin/products/${p._id}`, { method: "PATCH", body: { active: !p.active } }); await load(); }
  async function del(p) { if (confirm("Delete?")) { await api(`/api/admin/products/${p._id}`, { method: "DELETE" }); await load(); } }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Products</h1>
      <div className="card p-4 mb-4 grid grid-cols-6 gap-2 items-end">
        <L label="Brand"><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></L>
        <L label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></L>
        <L label="Original $"><input type="number" value={form.originalPrice} onChange={e => setForm({ ...form, originalPrice: e.target.value })} /></L>
        <L label="Image URL"><input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} /></L>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isLatest} onChange={e => setForm({ ...form, isLatest: e.target.checked })} /> latest</label>
        <button className="btn" onClick={create}>Add</button>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr className="text-cream/60"><th>Brand</th><th>Name</th><th>Price</th><th>Latest</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {items.map(p => (
              <tr key={p._id}>
                <td>{p.brand}</td><td>{p.name}</td><td>${p.originalPrice}</td>
                <td>{p.isLatest ? "★" : ""}</td>
                <td><button className="btn-ghost" onClick={() => toggle(p)}>{p.active ? "on" : "off"}</button></td>
                <td><button className="btn-ghost" onClick={() => del(p)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
function L({ label, children }) { return <label className="text-sm"><div className="text-xs text-cream/60">{label}</div>{children}</label>; }
