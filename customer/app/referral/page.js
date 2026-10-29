"use client";
import { useEffect, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { UserPlus, Copy, Check, Gift } from "lucide-react";

export default function ReferralPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState("");

  useEffect(() => { api("/api/me/referral").then(setData).catch(() => {}); }, []);

  const link = typeof window !== "undefined" && data?.code ? `${window.location.origin}/auth?ref=${data.code}` : "";
  function copy(txt, which) { navigator.clipboard?.writeText(txt); setCopied(which); setTimeout(() => setCopied(""), 1500); }

  return (
    <div className="page space-y-6">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Invite &amp; Earn</h1>
      <p className="text-cream/60 -mt-2">Share your code. When an invitee verifies, you earn ${data?.bonus ?? 10}.</p>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-6 md:col-span-2 fadein">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold"><Gift size={22} /></span>
            <h3 className="font-display text-xl text-gold">Your Invite</h3></div>

          <div className="mt-5">
            <div className="label">Referral Code</div>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-gold/20 px-4 py-3">
              <span className="font-mono text-2xl tracking-widest text-gold">{data?.code || me.referralCode || "—"}</span>
              <button onClick={() => copy(data?.code || me.referralCode || "", "code")} className="btn-outline py-1.5 px-3 text-sm">
                {copied === "code" ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="label">Invite Link</div>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gold/20 px-4 py-3">
              <span className="truncate text-sm text-cream/70">{link || "—"}</span>
              <button onClick={() => copy(link, "link")} className="btn-outline py-1.5 px-3 text-sm shrink-0">
                {copied === "link" ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="stat fadein-2"><div className="label">Invited</div><div className="text-3xl font-semibold mt-1">{data?.count ?? 0}</div></div>
          <div className="stat fadein-2"><div className="label">Verified</div><div className="text-3xl font-semibold text-gold mt-1">{data?.verifiedCount ?? 0}</div></div>
        </div>
      </div>

      <div className="card p-6 fadein-3">
        <div className="mb-4 flex items-center gap-2"><UserPlus size={18} className="text-gold" /><h3 className="font-display text-xl text-gold">Your Invitees</h3></div>
        <div className="divide-y divide-white/5">
          {(data?.invited || []).map((u, i) => (
            <div key={i} className="flex items-center justify-between py-3 text-sm">
              <span className="text-cream">{u.name}</span>
              <span className={u.verified ? "text-emerald-400" : "text-cream/50"}>{u.verified ? "Verified" : "Pending"}</span>
            </div>
          ))}
          {!data?.invited?.length && <div className="py-6 text-center text-cream/50 text-sm">No invites yet — share your code above.</div>}
        </div>
      </div>
    </div>
  );
}
