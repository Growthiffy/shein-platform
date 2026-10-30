"use client";
import { Check } from "lucide-react";

// Visual stepper for a deposit/withdrawal lifecycle.
// `steps`: [{ key, label }] in order. `current`: processingStage string.
// `history`: array of { stage, at } to show timestamps on completed steps.
export default function StageTracker({ steps, current, history = [] }) {
  const rejected = current === "rejected";
  const needsVerify = current === "requires_verification";
  const idx = steps.findIndex(s => s.key === current);
  const atFor = (key) => {
    const h = [...history].reverse().find(x => x.stage === key);
    return h ? new Date(h.at) : null;
  };

  if (rejected || needsVerify) {
    return (
      <div className={`mt-3 rounded-lg p-3 text-sm ${rejected ? "bg-rose-500/10 text-rose-600 border border-rose-500/30" : "bg-amber-500/10 text-amber-700 border border-amber-500/30"}`}>
        {rejected ? "This request was rejected. Any held funds have been returned to your balance."
          : "Additional verification is required before this request can continue."}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {steps.map((s, i) => {
        const done = idx > i;
        const active = idx === i;
        const at = atFor(s.key);
        return (
          <div key={s.key} className="flex items-center gap-3">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold
              ${done ? "bg-emerald-500 text-white"
                : active ? "gold-grad text-white animate-pulse"
                : "bg-black/[0.06] text-cream/40"}`}>
              {done ? <Check size={14} /> : i + 1}
            </span>
            <div className="flex-1">
              <div className={`text-sm ${done || active ? "text-cream" : "text-cream/45"}`}>{s.label}</div>
              {done && at && <div className="text-xs text-cream/40">{at.toLocaleString()}</div>}
              {active && <div className="text-xs text-gold2">In progress…</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const WITHDRAW_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "processing", label: "Processing" },
  { key: "completed", label: "Completed" },
];
export const DEPOSIT_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "processing", label: "Blockchain Confirmation" },
  { key: "under_review", label: "Under Review" },
  { key: "completed", label: "Credited" },
];

// Small colored badge for a stage, used in history rows.
export function StageBadge({ stage }) {
  const map = {
    submitted: "bg-black/[0.06] text-cream/60",
    under_review: "bg-blue-500/15 text-blue-600",
    processing: "bg-amber-500/15 text-amber-700",
    completed: "bg-emerald-500/15 text-emerald-600",
    requires_verification: "bg-amber-500/15 text-amber-700",
    rejected: "bg-rose-500/15 text-rose-600",
  };
  const label = (stage || "submitted").replace(/_/g, " ");
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${map[stage] || map.submitted}`}>{label}</span>;
}
