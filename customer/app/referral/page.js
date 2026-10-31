"use client";
import { useEffect, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { UserPlus, Copy, Check, Gift, MessageCircle, Send, Award } from "lucide-react";

export default function ReferralPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me } = useMe();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState("");

  useEffect(() => { api("/api/me/referral").then(setData).catch(() => {}); }, []);

  const code = data?.code || me.referralCode || "";
  const link = typeof window !== "undefined" && code ? `${window.location.origin}/auth?ref=${code}` : "";
  const shareMsg = `Join Shein and earn with me! Use my code ${code} for a $20 signup bonus. ${link}`;
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
              <span className="min-w-0 flex-1 truncate text-sm text-cream/70">{link || "—"}</span>
              <button onClick={() => copy(link, "link")} className="btn-outline py-1.5 px-3 text-sm shrink-0">
                {copied === "link" ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`} target="_blank" rel="noreferrer" className="btn-outline py-2 px-4 text-sm"><MessageCircle size={15} /> WhatsApp</a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareMsg)}`} target="_blank" rel="noreferrer" className="btn-outline py-2 px-4 text-sm"><Send size={15} /> Telegram</a>
            <button onClick={() => copy(shareMsg, "msg")} className="btn-outline py-2 px-4 text-sm">{copied === "msg" ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy message</>}</button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="stat fadein-2"><div className="label">Invited</div><div className="text-3xl font-semibold mt-1">{data?.count ?? 0}</div></div>
          <div className="stat fadein-2"><div className="label">Verified</div><div className="text-3xl font-semibold text-gold mt-1">{data?.verifiedCount ?? 0}</div></div>
          <div className="stat fadein-2"><div className="label">Earned from referrals</div><div className="text-3xl font-semibold text-gold mt-1">${(data?.earned ?? 0).toFixed(2)}</div></div>
        </div>
      </div>

      {/* how it works */}
      <div className="card p-6 fadein-2">
        <h3 className="font-display text-xl text-gold mb-4">How it works</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Share your code", "Send your unique code or link to friends."],
            ["Friend signs up", "They register and verify their email."],
            ["You both earn", `You each get a $${data?.bonus ?? 10} bonus.`],
          ].map(([t, d], i) => (
            <div key={i} className="rounded-xl border border-line p-4">
              <div className="grid h-8 w-8 place-items-center rounded-full gold-grad text-white font-bold">{i + 1}</div>
              <div className="font-semibold text-cream mt-2">{t}</div>
              <div className="text-sm text-cream/60 mt-1">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* tier rewards */}
      <div className="card p-6 fadein-3">
        <div className="mb-4 flex items-center gap-2"><Award size={18} className="text-gold" /><h3 className="font-display text-xl text-gold">Referrer Tiers</h3></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { n: 5, name: "Silver Referrer" },
            { n: 20, name: "Gold Referrer" },
          ].map(t => {
            const reached = (data?.count ?? 0) >= t.n;
            return (
              <div key={t.n} className={`flex items-center justify-between rounded-xl border p-4 ${reached ? "border-gold2/50 bg-gold2/5" : "border-line"}`}>
                <div>
                  <div className="font-semibold text-cream">{t.name}</div>
                  <div className="text-sm text-cream/55">Invite {t.n} friends</div>
                </div>
                <span className={`chip ${reached ? "text-gold2 border-gold2/40" : ""}`}>{reached ? "Unlocked" : `${data?.count ?? 0}/${t.n}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6 fadein-3">
        <div className="mb-4 flex items-center gap-2"><UserPlus size={18} className="text-gold" /><h3 className="font-display text-xl text-gold">Your Invitees</h3></div>
        <div className="divide-y divide-white/5">
          {(data?.invited || []).map((u, i) => (
            <div key={i} className="flex items-center justify-between py-3 text-sm">
              <span className="text-cream">{u.name}</span>
              <span className={u.verified ? "text-emerald-600" : "text-cream/50"}>{u.verified ? "Verified" : "Pending"}</span>
            </div>
          ))}
          {!data?.invited?.length && <div className="py-6 text-center text-cream/50 text-sm">No invites yet — share your code above.</div>}
        </div>
      </div>
    </div>
  );
}
