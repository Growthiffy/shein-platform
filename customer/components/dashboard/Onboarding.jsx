"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Check, X, Award } from "lucide-react";

const LINKS = {
  verify_email: "/profile",
  set_username: "/profile",
  first_analysis: "/analyst",
  first_deposit: "/wallet/deposit",
  join_community: "/community",
  choose_mentor: "/mentor",
};
const DISMISS_KEY = "shein_onboarding_min";
const DONE_KEY = "shein_onboarding_done";

export default function Onboarding() {
  const [data, setData] = useState(null);
  const [min, setMin] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    try { setMin(!!localStorage.getItem(DISMISS_KEY)); setCelebrated(!!localStorage.getItem(DONE_KEY)); } catch {}
    api("/api/me/onboarding").then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  // Completed and already celebrated → hide permanently.
  if (data.allDone && celebrated) return null;

  if (data.allDone && !celebrated) {
    return (
      <div className="mt-6 card p-6 text-center fadein border-gold2/40">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full gold-grad text-white" style={{ animation: "pop-in .4s ease-out both" }}>
          <Award size={26} />
        </div>
        <h3 className="font-display text-2xl text-gold">Onboarding complete!</h3>
        <p className="text-cream/65 mt-1 text-sm">You&apos;ve earned your Analyst certification badge.</p>
        <button className="btn-gold mt-4" onClick={() => { try { localStorage.setItem(DONE_KEY, "1"); } catch {} setCelebrated(true); }}>Nice!</button>
      </div>
    );
  }

  if (min) {
    return (
      <button onClick={() => { try { localStorage.removeItem(DISMISS_KEY); } catch {} setMin(false); }}
        className="mt-4 text-sm text-gold2 hover:underline">
        Resume onboarding ({data.completedCount}/{data.totalCount})
      </button>
    );
  }

  const pct = Math.round((data.completedCount / data.totalCount) * 100);
  return (
    <div className="mt-6 card p-5 fadein">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-xl text-gold">Getting Started</h3>
          <p className="text-xs text-cream/55 mt-0.5">Complete all steps to earn your Analyst certification badge.</p>
        </div>
        <button onClick={() => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} setMin(true); }}
          className="text-cream/40 hover:text-cream" title="Minimize"><X size={16} /></button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-black/[0.06] overflow-hidden">
          <div className="h-full rounded-full gold-grad transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm text-cream/60">{data.completedCount}/{data.totalCount}</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.steps.map(s => (
          <StepRow key={s.key} step={s} />
        ))}
      </div>
    </div>
  );
}

function StepRow({ step }) {
  const inner = (
    <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${step.done ? "border-line bg-ink2" : "border-gold2/30 hover:border-gold2/60"}`}>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${step.done ? "bg-emerald-500 text-white" : "border border-cream/30"}`}>
        {step.done && <Check size={12} />}
      </span>
      <span className={`text-sm ${step.done ? "text-cream/45 line-through" : "text-cream"}`}>{step.label}</span>
    </div>
  );
  if (step.done) return inner;
  return <Link href={LINKS[step.key] || "/dashboard"}>{inner}</Link>;
}
