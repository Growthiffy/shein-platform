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
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() { setItems((await api("/api/admin/products")).items); }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);

  async function create() {
    await api("/api/admin/products", { method: "POST", body: productPayload(form) });
    setForm({ brand: BRANDS[0], name: PRODUCT_NAMES[0], originalPrice: "", image: "", isLatest: false, category: "fashion", marketBrief: "" });
    await load();
  }
  async function toggle(p) { await api(`/api/admin/products/${p._id}`, { method: "PATCH", body: { active: !p.active } }); await load(); }
  async function toggleLatest(p) { await api(`/api/admin/products/${p._id}`, { method: "PATCH", body: { isLatest: !p.isLatest } }); await load(); }
  async function del(p) { if (confirm("Delete?")) { await api(`/api/admin/products/${p._id}`, { method: "DELETE" }); await load(); } }

  function startEdit(p) {
    setEditId(p._id);
    setEdit({ brand: p.brand, name: p.name, originalPrice: p.originalPrice, image: p.image || "", active: p.active, isLatest: p.isLatest, category: p.category || "fashion", marketBrief: p.marketBrief || "" });
  }
  async function saveEdit(p) {
    await api(`/api/admin/products/${p._id}`, { method: "PATCH", body: productPayload(edit) });
    setEditId(null); await load();
  }

  async function run(action) {
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Products</h1>
      {error && <p role="alert" className="mb-4 text-red-400">{error}</p>}
      <datalist id="product-brands">{BRANDS.map(b => <option key={b} value={b} />)}</datalist>
      <datalist id="product-names">{PRODUCT_NAMES.map(n => <option key={n} value={n} />)}</datalist>
      <fieldset disabled={busy} className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end">
        <L label="Brand">
          <input list="product-brands" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full" placeholder="Choose or enter any brand" />
        </L>
        <L label="Name">
          <input list="product-names" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full" placeholder="Choose or enter any product" />
        </L>
        <L label="Original $"><input type="number" min="0" step="any" value={form.originalPrice} onChange={e => setForm({ ...form, originalPrice: e.target.value })} className="w-full" /></L>
        <L label="Image URL"><input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="w-full" /></L>
        <L label="Category">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </L>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isLatest} onChange={e => setForm({ ...form, isLatest: e.target.checked })} /> latest</label>
        <L label="Market brief (optional)" className="sm:col-span-2 lg:col-span-5">
          <input value={form.marketBrief} onChange={e => setForm({ ...form, marketBrief: e.target.value })} className="w-full" placeholder="Leave blank to auto-generate" />
        </L>
        <button className="btn" onClick={() => run(create)}>{busy ? "Saving…" : "Add"}</button>
      </fieldset>
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
                  <td><button className="btn-ghost" disabled={busy} onClick={() => run(() => toggleLatest(p))}>{p.isLatest ? "★ latest" : "normal"}</button></td>
                  <td><button className="btn-ghost" disabled={busy} onClick={() => run(() => toggle(p))}>{p.active ? "on" : "off"}</button></td>
                  <td className="whitespace-nowrap">
                    <button className="btn-ghost" disabled={busy} onClick={() => editId === p._id ? setEditId(null) : startEdit(p)}>Edit</button>
                    <button className="btn-ghost" disabled={busy} onClick={() => run(() => del(p))}>Delete</button>
                  </td>
                </tr>
                {editId === p._id && (
                  <tr>
                    <td colSpan={8} className="bg-black/5">
                      <fieldset disabled={busy} className="p-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-end">
                        <L label="Brand"><input list="product-brands" value={edit.brand} onChange={e => setEdit({ ...edit, brand: e.target.value })} className="w-full" /></L>
                        <L label="Name"><input list="product-names" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} className="w-full" /></L>
                        <L label="Original $"><input type="number" min="0" step="any" value={edit.originalPrice} onChange={e => setEdit({ ...edit, originalPrice: e.target.value })} className="w-full" /></L>
                        <L label="Image URL"><input value={edit.image} onChange={e => setEdit({ ...edit, image: e.target.value })} className="w-full" /></L>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.isLatest} onChange={e => setEdit({ ...edit, isLatest: e.target.checked })} /> Latest</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} /> Active</label>
                        <L label="Category">
                          <select value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })} className="w-full">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </L>
                        <L label="Market brief">
                          <textarea rows={2} value={edit.marketBrief} onChange={e => setEdit({ ...edit, marketBrief: e.target.value })} className="w-full" />
                        </L>
                        <div className="flex gap-2">
                          <button className="btn" onClick={() => run(() => saveEdit(p))}>{busy ? "Saving…" : "Save"}</button>
                          <button className="btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      </fieldset>
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

function productPayload(value) {
  const originalPrice = Number(value.originalPrice);
  if (!value.brand.trim() || !value.name.trim()) throw new Error("Enter a brand and product name.");
  if (String(value.originalPrice).trim() === "" || !Number.isFinite(originalPrice) || originalPrice < 0) throw new Error("Enter a valid price of zero or more.");
  return { ...value, brand: value.brand.trim(), name: value.name.trim(), originalPrice };
}
