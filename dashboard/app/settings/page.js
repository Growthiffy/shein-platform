"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

// Known settings with human labels, grouped, with an input type so we coerce the
// value correctly on save. Unknown keys from the API still render as text.
const GROUPS = [
  { title: "Core", keys: [
    { key: "minWithdrawalUsd", label: "Minimum withdrawal (USD)", type: "number" },
    { key: "investLockWeeks",  label: "Investment lock period (weeks)", type: "number" },
    { key: "personaChatIntervalMin", label: "Persona chat interval (min)", type: "number" },
  ]},
  { title: "Activity & stats", keys: [
    { key: "activityFeedEnabled", label: "Activity feed enabled", type: "boolean" },
    { key: "platformMemberCount", label: "Active analysts (displayed count)", type: "number" },
    { key: "personaActiveHoursStart", label: "Persona active hour start (0-23)", type: "number" },
    { key: "personaActiveHoursEnd", label: "Persona active hour end (0-23)", type: "number" },
  ]},
  { title: "Company identity", keys: [
    { key: "companyName", label: "Company name", type: "text" },
    { key: "companyRegistration", label: "Company registration no.", type: "text" },
    { key: "socialTelegram", label: "Telegram URL", type: "text" },
    { key: "socialTwitter", label: "Twitter / X URL", type: "text" },
    { key: "socialInstagram", label: "Instagram URL", type: "text" },
    { key: "supportEmail", label: "Support email", type: "text" },
    { key: "supportPhone", label: "Support phone", type: "text" },
  ]},
  { title: "Financial", keys: [
    { key: "withdrawalFeeUsd", label: "Withdrawal network fee (USD)", type: "number" },
    { key: "withdrawalProcessingHours", label: "Withdrawal processing (hours)", type: "number" },
    { key: "depositDailyLimit", label: "Deposit daily limit (USD)", type: "number" },
    { key: "depositMonthlyLimit", label: "Deposit monthly limit (USD)", type: "number" },
    { key: "verificationWithdrawalThreshold", label: "Verification withdrawal threshold (USD)", type: "number" },
  ]},
  { title: "Support", keys: [
    { key: "supportAutoReplyEnabled", label: "Support auto-reply enabled", type: "boolean" },
    { key: "supportAutoReplyText", label: "Support auto-reply text ({ticketNumber})", type: "textarea" },
  ]},
];

const META = Object.fromEntries(GROUPS.flatMap(g => g.keys.map(k => [k.key, k])));

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [msg, setMsg] = useState("");

  async function load() { setSettings((await api("/api/admin/settings")).settings || {}); }
  useEffect(() => { load(); }, []);

  async function save(key, value) {
    setMsg("");
    const type = META[key]?.type || "text";
    let out = value;
    if (type === "number") out = Number(value);
    else if (type === "boolean") out = !!value;
    try {
      await api(`/api/admin/settings/${key}`, { method: "PUT", body: { value: out } });
      await load(); setMsg(`${key} saved ✓`);
    } catch (e) { setMsg(e.message); }
  }

  const known = new Set(Object.keys(META));
  const extraKeys = Object.keys(settings).filter(k => !known.has(k));

  return (
    <Shell>
      <h1 className="text-2xl text-gold mb-4">Settings</h1>
      <div className="space-y-5 max-w-2xl">
        {GROUPS.map(g => (
          <div key={g.title} className="card p-4 space-y-3">
            <div className="text-sm text-gold font-semibold">{g.title}</div>
            {g.keys.map(k => (
              <SettingRow key={k.key} meta={k} value={settings[k.key]} onSave={v => save(k.key, v)} />
            ))}
          </div>
        ))}
        {extraKeys.length > 0 && (
          <div className="card p-4 space-y-3">
            <div className="text-sm text-gold font-semibold">Other</div>
            {extraKeys.map(key => (
              <SettingRow key={key} meta={{ key, label: key, type: "text" }} value={settings[key]} onSave={v => save(key, v)} />
            ))}
          </div>
        )}
        {msg && <div className="text-cream/60 text-sm">{msg}</div>}
      </div>
    </Shell>
  );
}

function SettingRow({ meta, value, onSave }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  const type = meta.type;

  if (type === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-cream/70 flex-1">{meta.label}</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!v} onChange={e => { setV(e.target.checked); onSave(e.target.checked); }} />
          {v ? "on" : "off"}
        </label>
      </div>
    );
  }
  if (type === "textarea") {
    return (
      <div className="space-y-1">
        <span className="text-sm text-cream/70">{meta.label}</span>
        <textarea value={v} onChange={e => setV(e.target.value)} rows={3} className="w-full" />
        <button className="btn" onClick={() => onSave(v)}>Save</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-cream/70 flex-1">{meta.label}</span>
      <input type={type === "number" ? "number" : "text"} value={v} onChange={e => setV(e.target.value)}
        className={type === "number" ? "w-32" : "w-64"} />
      <button className="btn" onClick={() => onSave(v)}>Save</button>
    </div>
  );
}
