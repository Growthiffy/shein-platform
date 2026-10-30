"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { ShieldCheck, Trash2 } from "lucide-react";

export default function Admins() {
  const [items, setItems] = useState([]);
  const [perms, setPerms] = useState([]);
  const [meFull, setMeFull] = useState(true);
  const [form, setForm] = useState({ email: "", username: "", password: "", fullAccess: true, permissions: [] });
  const [msg, setMsg] = useState("");

  async function load() {
    setItems((await api("/api/admin/admins")).items);
    const p = await api("/api/admin/permissions").catch(() => null);
    if (p) { setPerms(p.permissions); setMeFull(p.me.fullAccess); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg("");
    try {
      const body = { email: form.email, username: form.username, password: form.password, permissions: form.fullAccess ? [] : form.permissions };
      await api("/api/admin/admins", { method: "POST", body });
      setForm({ email: "", username: "", password: "", fullAccess: true, permissions: [] }); setMsg("operator created ✓"); await load();
    } catch (e) { setMsg(e.message); }
  }
  async function remove(id) {
    if (!confirm("Remove this admin operator?")) return;
    try { await api(`/api/admin/admins/${id}`, { method: "DELETE" }); await load(); }
    catch (e) { alert(e.message); }
  }
  async function savePerms(op, fullAccess, permissions) {
    try { await api(`/api/admin/admins/${op._id}`, { method: "PATCH", body: { fullAccess, permissions } }); await load(); }
    catch (e) { alert(e.message); }
  }
  async function saveMentor(op, body) {
    try { await api(`/api/admin/admins/${op._id}/mentor`, { method: "PATCH", body }); await load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-1"><ShieldCheck size={20} className="text-gold" /><h1 className="text-2xl text-gold font-display">Admin Operators</h1></div>
      <p className="text-cream/50 text-sm mb-5">Backend operators — separate from members. Scope each operator's access with permissions; full access = owner.</p>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2 space-y-3">
          {items.map(a => (
            <OperatorRow key={a._id} op={a} perms={perms} canEdit={meFull} onSave={savePerms} onSaveMentor={saveMentor} onRemove={() => remove(a._id)} />
          ))}
          {!items.length && <div className="text-cream/50">No operators.</div>}
        </div>

        <div className="card p-4 space-y-3 h-max">
          <div className="text-gold">Add operator</div>
          <label className="text-sm block">Username *<input className="w-full mt-1" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></label>
          <label className="text-sm block">Email (optional)<input className="w-full mt-1" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label className="text-sm block">Password (min 8)<input type="password" className="w-full mt-1" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.fullAccess} onChange={e => setForm({ ...form, fullAccess: e.target.checked })} /> Full access (owner)</label>
          {!form.fullAccess && (
            <div className="grid grid-cols-2 gap-1">
              {perms.map(p => (
                <label key={p.key} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={form.permissions.includes(p.key)}
                    onChange={e => setForm(f => ({ ...f, permissions: e.target.checked ? [...f.permissions, p.key] : f.permissions.filter(x => x !== p.key) }))} />
                  {p.label}
                </label>
              ))}
            </div>
          )}
          <button className="btn w-full" onClick={create}>Create operator</button>
          {msg && <div className="text-cream/60 text-sm">{msg}</div>}
        </div>
      </div>
    </Shell>
  );
}

function OperatorRow({ op, perms, canEdit, onSave, onSaveMentor, onRemove }) {
  const [open, setOpen] = useState(false);
  const [mOpen, setMOpen] = useState(false);
  const [full, setFull] = useState(op.fullAccess);
  const [sel, setSel] = useState(op.permissions || []);
  const isMentor = !!(op.mentor && op.mentor.active);
  const [mf, setMf] = useState({ name: op.mentor?.name || op.username || "", title: op.mentor?.title || "", bio: "" });
  useEffect(() => {
    setFull(op.fullAccess); setSel(op.permissions || []);
    setMf({ name: op.mentor?.name || op.username || "", title: op.mentor?.title || "", bio: "" });
  }, [op]);
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-cream font-medium flex items-center gap-2">
            {op.username || "—"} <span className="text-cream/40 text-xs">{op.email || ""}</span>
            {isMentor && <span className="rounded-full bg-gold/15 text-gold text-[10px] px-2 py-0.5">MENTOR</span>}
          </div>
          <div className="text-xs text-cream/50">{op.fullAccess ? "Full access (owner)" : (op.permissions?.length ? op.permissions.join(", ") : "No permissions")}</div>
        </div>
        <div className="flex gap-2">
          {canEdit && <button className="btn-ghost text-xs" onClick={() => { setMOpen(o => !o); setOpen(false); }}>{isMentor ? "Mentor" : "Make mentor"}</button>}
          {canEdit && <button className="btn-ghost text-xs" onClick={() => { setOpen(o => !o); setMOpen(false); }}>{open ? "Close" : "Permissions"}</button>}
          <button className="btn-ghost text-xs" onClick={onRemove}><Trash2 size={13} /></button>
        </div>
      </div>
      {open && canEdit && (
        <div className="mt-3 border-t border-line pt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={full} onChange={e => setFull(e.target.checked)} /> Full access (owner)</label>
          {!full && (
            <div className="grid grid-cols-2 gap-1">
              {perms.map(p => (
                <label key={p.key} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={sel.includes(p.key)}
                    onChange={e => setSel(s => e.target.checked ? [...s, p.key] : s.filter(x => x !== p.key))} />
                  {p.label}
                </label>
              ))}
            </div>
          )}
          <button className="btn text-xs" onClick={() => onSave(op, full, sel)}>Save permissions</button>
        </div>
      )}
      {mOpen && canEdit && (
        <div className="mt-3 border-t border-line pt-3 space-y-2">
          <div className="text-xs text-cream/60">A mentor replies to assigned members as a real person from <b>My Juniors</b>. While they have a room open, the AI personas stay silent there.</div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs block">Display name<input className="w-full mt-1" value={mf.name} onChange={e => setMf({ ...mf, name: e.target.value })} /></label>
            <label className="text-xs block">Title<input className="w-full mt-1" value={mf.title} onChange={e => setMf({ ...mf, title: e.target.value })} placeholder="Senior Investment Mentor" /></label>
          </div>
          <label className="text-xs block">Bio<input className="w-full mt-1" value={mf.bio} onChange={e => setMf({ ...mf, bio: e.target.value })} /></label>
          <div className="flex gap-2">
            <button className="btn text-xs" onClick={() => onSaveMentor(op, { enabled: true, name: mf.name, title: mf.title, bio: mf.bio })}>{isMentor ? "Save mentor profile" : "Enable mentor"}</button>
            {isMentor && <button className="btn-ghost text-xs" onClick={() => onSaveMentor(op, { enabled: false })}>Disable mentor</button>}
          </div>
        </div>
      )}
    </div>
  );
}
