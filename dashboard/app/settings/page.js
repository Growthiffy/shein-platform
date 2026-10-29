"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

// Known settings with human labels. Unknown keys from the API still render.
const KNOWN = [
  { key: "minWithdrawalUsd", label: "Minimum withdrawal (USD)" },
  { key: "investLockWeeks",  label: "Investment lock period (weeks)" },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [msg, setMsg] = useState("");

  async function load() { setSettings((await api("/api/admin/settings")).settings || {}); }
  useEffect(() => { load(); }, []);

  async function save(key, value) {
    setMsg("");
    try {
      await api(`/api/admin/settings/${key}`, { method: "PUT", body: { value: Number(value) } });
      await load(); setMsg(`${key} saved ✓`);
    } catch (e) { setMsg(e.message); }
  }

  const keys = [...new Set([...KNOWN.map(k => k.key), ...Object.keys(settings)])];

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Settings</h1>
      <div className="card p-4 max-w-xl space-y-4">
        {keys.map(key => {
          const label = KNOWN.find(k => k.key === key)?.label || key;
          return <SettingRow key={key} label={label} value={settings[key]} onSave={v => save(key, v)} />;
        })}
        {msg && <div className="text-cream/60 text-sm">{msg}</div>}
      </div>
    </Shell>
  );
}

function SettingRow({ label, value, onSave }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-cream/70 flex-1">{label}</span>
      <input type="number" value={v} onChange={e => setV(e.target.value)} className="w-32" />
      <button className="btn" onClick={() => onSave(v)}>Save</button>
    </div>
  );
}
