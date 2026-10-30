"use client";
import { useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { Check, Lock, ShieldCheck, Clock } from "lucide-react";

export default function VerificationPage() { return <AppShell><Body /></AppShell>; }

const COUNTRIES = ["United Kingdom", "United States", "Germany", "France", "Spain", "Italy", "Netherlands", "Canada", "Australia", "UAE", "Singapore", "India", "Nigeria", "South Africa", "Other"];
const ID_TYPES = [
  { v: "passport", label: "Passport" },
  { v: "national_id", label: "National ID" },
  { v: "drivers_license", label: "Driver's License" },
];

const RANK = { none: 0, basic: 1, standard: 2, pending_premium: 2, premium: 3 };

function Body() {
  const { me, refresh } = useMe();
  const toast = useToast();
  const level = me.verification?.level || "none";
  const rank = RANK[level] ?? 0;
  const pendingPremium = level === "pending_premium";

  const [std, setStd] = useState({ fullName: me.verification?.fullName || "", phone: me.verification?.phone || me.phone || "", country: me.verification?.country || "" });
  const [idf, setIdf] = useState({ idType: "passport", idNumber: "", idImageUrl: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitStd() {
    setErr(""); setBusy(true);
    try { await api("/api/me/verify", { method: "POST", body: std }); await refresh(); toast({ text: "Standard verification complete", type: "success" }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function submitId() {
    setErr(""); setBusy(true);
    try { await api("/api/me/verify/id", { method: "POST", body: idf }); await refresh(); toast({ text: "ID submitted — under review", type: "info" }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="page max-w-3xl">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Verification</h1>
      <p className="text-cream/65 mt-1">Raise your verification level to unlock higher limits and features.</p>

      {/* Basic */}
      <LevelCard n={1} title="Basic" status={rank >= 1 ? "done" : "current"}
        benefits={["Analyst access", "Deposits up to $5,000"]}>
        <div className="text-sm text-cream/60">Email verified. This level is active.</div>
      </LevelCard>

      {/* Standard */}
      <LevelCard n={2} title="Standard" status={rank >= 2 ? "done" : rank === 1 ? "current" : "locked"}
        benefits={["Withdrawals up to $5,000", "Full community access"]}>
        {rank >= 2 ? (
          <div className="text-sm text-emerald-600">Personal information verified.</div>
        ) : rank === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={std.fullName} onChange={v => setStd({ ...std, fullName: v })} />
            <Field label="Phone" value={std.phone} onChange={v => setStd({ ...std, phone: v })} />
            <label className="block sm:col-span-2"><span className="label mb-1 block">Country</span>
              <select value={std.country} onChange={e => setStd({ ...std, country: e.target.value })} className="field">
                <option value="">Select country…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <div className="sm:col-span-2">
              <button className="btn-gold" onClick={submitStd} disabled={busy || !std.fullName || !std.country}>{busy ? "Submitting…" : "Verify personal info"}</button>
            </div>
          </div>
        ) : <div className="text-sm text-cream/50">Complete Basic first.</div>}
      </LevelCard>

      {/* Premium */}
      <LevelCard n={3} title="Premium" status={level === "premium" ? "done" : pendingPremium ? "review" : rank >= 2 ? "current" : "locked"}
        benefits={["Unlimited withdrawals", "Priority support", "Premium badge"]}>
        {level === "premium" ? (
          <div className="text-sm text-emerald-600">Identity verified. Premium active.</div>
        ) : pendingPremium ? (
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Clock size={16} /> Verification under review · Estimated review time: 24-48 hours
          </div>
        ) : rank >= 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label mb-1 block">ID type</span>
              <select value={idf.idType} onChange={e => setIdf({ ...idf, idType: e.target.value })} className="field">
                {ID_TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </label>
            <Field label="ID number" value={idf.idNumber} onChange={v => setIdf({ ...idf, idNumber: v })} />
            <Field label="ID image URL (optional)" value={idf.idImageUrl} onChange={v => setIdf({ ...idf, idImageUrl: v })} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <button className="btn-gold" onClick={submitId} disabled={busy || !idf.idNumber}>{busy ? "Submitting…" : "Submit ID for review"}</button>
            </div>
          </div>
        ) : <div className="text-sm text-cream/50">Complete Standard first.</div>}
      </LevelCard>

      {err && <div className="text-red-500 text-sm mt-3">{err}</div>}
    </div>
  );
}

function LevelCard({ n, title, status, benefits, children }) {
  const icon = status === "done" ? <Check size={16} /> : status === "locked" ? <Lock size={14} /> : status === "review" ? <Clock size={15} /> : <ShieldCheck size={15} />;
  const ring = status === "done" ? "bg-emerald-500 text-white"
    : status === "locked" ? "bg-black/[0.06] text-cream/40"
    : status === "review" ? "bg-amber-500 text-white"
    : "gold-grad text-white";
  return (
    <div className={`mt-5 card p-5 ${status === "locked" ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 place-items-center rounded-full ${ring}`}>{icon}</span>
        <div>
          <div className="font-display text-lg text-gold">Level {n}: {title}</div>
          <div className="text-xs text-cream/50">{benefits.join(" · ")}</div>
        </div>
        <span className="ml-auto text-xs capitalize text-cream/55">{status === "review" ? "under review" : status}</span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} className="field" />
    </label>
  );
}
