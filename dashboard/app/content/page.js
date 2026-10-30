"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Content() {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [f, setF] = useState({ title: "", slug: "", content: "", active: true });
  const [msg, setMsg] = useState("");

  async function load() { setItems((await api("/api/admin/pages")).items || []); }
  useEffect(() => { load(); }, []);
  function edit(p) { setSel(p); setF({ title: p.title, slug: p.slug, content: p.content || "", active: p.active !== false }); setMsg(""); }
  function reset() { setSel(null); setF({ title: "", slug: "", content: "", active: true }); setMsg(""); }
  async function save() {
    setMsg("");
    try {
      if (sel) await api(`/api/admin/pages/${sel._id}`, { method: "PATCH", body: f });
      else await api("/api/admin/pages", { method: "POST", body: f });
      setMsg("saved ✓"); reset(); await load();
    } catch (e) { setMsg(e.message); }
  }
  async function del(id) { if (confirm("Delete this page?")) { await api(`/api/admin/pages/${id}`, { method: "DELETE" }); reset(); await load(); } }

  return (
    <Shell>
      <h1 className="text-2xl text-gold font-display mb-1">Content pages</h1>
      <p className="text-cream/50 text-sm mb-4">Admin-editable pages served to the public by slug (e.g. /p/about-us). HTML allowed.</p>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-2 space-y-1 h-max">
          <button className="btn w-full text-sm mb-1" onClick={reset}>+ New page</button>
          {items.map(p => (
            <button key={p._id} onClick={() => edit(p)} className={`w-full text-left rounded px-3 py-2 ${sel?._id === p._id ? "bg-gold/15" : "hover:bg-white/5"}`}>
              <div className="text-cream">{p.title}</div>
              <div className="text-xs text-cream/45">/{p.slug} {p.active === false && "· hidden"}</div>
            </button>
          ))}
          {!items.length && <div className="text-cream/50 text-sm p-2">No pages.</div>}
        </div>
        <div className="card p-4 lg:col-span-2 space-y-3">
          <div className="text-gold">{sel ? "Edit page" : "New page"}</div>
          <label className="text-sm block">Title<input className="w-full mt-1" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></label>
          <label className="text-sm block">Slug<input className="w-full mt-1" value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} disabled={!!sel} placeholder="about-us" /></label>
          <label className="text-sm block">Content (HTML)<textarea rows={12} className="w-full mt-1 font-mono text-xs" value={f.content} onChange={e => setF({ ...f, content: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Active (publicly visible)</label>
          <div className="flex gap-2">
            <button className="btn" onClick={save}>{sel ? "Save" : "Create"}</button>
            {sel && <button className="btn-ghost text-red-500" onClick={() => del(sel._id)}>Delete</button>}
          </div>
          {msg && <div className="text-cream/60 text-sm">{msg}</div>}
        </div>
      </div>
    </Shell>
  );
}
