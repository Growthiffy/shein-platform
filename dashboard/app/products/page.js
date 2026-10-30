"use client";
import { Fragment, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { BRANDS, PRODUCT_NAMES } from "@/lib/constants";

const CATEGORIES = ["fashion", "electronics", "home", "beauty", "accessories", "sports"];

export default function Products() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ brand: BRANDS[0], name: PRODUCT_NAMES[0], originalPrice: "", image: "", isLatest: false, category: "fashion", marketBrief: "" });
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ category: "fashion", marketBrief: "" });

  async function load() { setItems((await api("/api/admin/products")).items); }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.originalPrice) return alert("Set original price");
    await api("/api/admin/products", { method: "POST", body: { ...form, originalPrice: Number(form.originalPrice) } });
    setForm({ brand: BRANDS[0], name: PRODUCT_NAMES[0], originalPrice: "", image: "", isLatest: false, category: "fashion", marketBrief: "" });
    await load();
  }
  async function toggle(p) { await api(`/api/admin/products/${p._id}`, { method: "PATCH", body: { active: !p.active } }); await load(); }
  async function toggleLatest(p) { await api(`/api/admin/products/${p._id}`, { method: "PATCH", body: { isLatest: !p.isLatest } }); await load(); }
  async function del(p) { if (confirm("Delete?")) { await api(`/api/admin/products/${p._id}`, { method: "DELETE" }); await load(); } }

  function startEdit(p) { setEditId(p._id); setEdit({ category: p.category || "fashion", marketBrief: p.marketBrief || "" }); }
  async function saveEdit(p) {
    await api(`/api/admin/products/${p._id}`, { method: "PATCH", body: { category: edit.category, marketBrief: edit.marketBrief } });
    setEditId(null); await load();
  }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Products</h1>
      <div className="card p-4 mb-4 grid grid-cols-6 gap-2 items-end">
        <L label="Brand">
          <select value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full">
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </L>
        <L label="Name">
          <select value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full">
            {PRODUCT_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </L>
        <L label="Original $"><input type="number" value={form.originalPrice} onChange={e => setForm({ ...form, originalPrice: e.target.value })} className="w-full" /></L>
        <L label="Image URL"><input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="w-full" /></L>
        <L label="Category">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </L>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isLatest} onChange={e => setForm({ ...form, isLatest: e.target.checked })} /> latest</label>
        <L label="Market brief (optional)" className="col-span-5">
          <input value={form.marketBrief} onChange={e => setForm({ ...form, marketBrief: e.target.value })} className="w-full" placeholder="Leave blank to auto-generate" />
        </L>
        <button className="btn" onClick={create}>Add</button>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr className="text-cream/60"><th>Img</th><th>Brand</th><th>Name</th><th>Price</th><th>Category</th><th>Latest</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {items.map(p => (
              <Fragment key={p._id}>
                <tr>
                  <td>{p.image ? <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" /> : <span className="text-cream/30">—</span>}</td>
                  <td>{p.brand}</td><td>{p.name}</td><td>${p.originalPrice}</td>
                  <td>{p.category || "—"}</td>
                  <td><button className="btn-ghost" onClick={() => toggleLatest(p)}>{p.isLatest ? "★ latest" : "normal"}</button></td>
                  <td><button className="btn-ghost" onClick={() => toggle(p)}>{p.active ? "on" : "off"}</button></td>
                  <td className="whitespace-nowrap">
                    <button className="btn-ghost" onClick={() => editId === p._id ? setEditId(null) : startEdit(p)}>Edit</button>
                    <button className="btn-ghost" onClick={() => del(p)}>Delete</button>
                  </td>
                </tr>
                {editId === p._id && (
                  <tr>
                    <td colSpan={8} className="bg-black/5">
                      <div className="p-3 grid gap-2 md:grid-cols-[180px_1fr_auto] items-end">
                        <L label="Category">
                          <select value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })} className="w-full">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </L>
                        <L label="Market brief">
                          <textarea rows={2} value={edit.marketBrief} onChange={e => setEdit({ ...edit, marketBrief: e.target.value })} className="w-full" />
                        </L>
                        <button className="btn" onClick={() => saveEdit(p)}>Save</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
function L({ label, children, className = "" }) { return <label className={`text-sm block ${className}`}><div className="text-xs text-cream/60">{label}</div>{children}</label>; }
