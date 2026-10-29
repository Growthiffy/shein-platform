"use client";
import { useEffect, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api } from "@/lib/api";
import { Shield, KeyRound, Monitor } from "lucide-react";

export default function SecurityPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const [logins, setLogins] = useState([]);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api("/api/me/security").then(d => setLogins(d.logins)).catch(() => {}); }, []);

  async function changePw() {
    setMsg(""); setBusy(true);
    try { await api("/api/me/password", { method: "POST", body: { current: cur, next } }); setCur(""); setNext(""); setMsg("✓ Password updated"); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="page space-y-6">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Security</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 fadein">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold"><KeyRound size={20} /></span>
            <h3 className="font-display text-xl text-gold">Change Password</h3></div>
          <label className="block mt-4"><span className="label">Current Password</span>
            <input type="password" className="field mt-1" value={cur} onChange={e => setCur(e.target.value)} /></label>
          <label className="block mt-3"><span className="label">New Password (min 8)</span>
            <input type="password" className="field mt-1" value={next} onChange={e => setNext(e.target.value)} /></label>
          {msg && <div className={`mt-2 text-sm ${msg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</div>}
          <button className="btn-gold mt-4 w-full" onClick={changePw} disabled={busy || !cur || next.length < 8}>UPDATE PASSWORD</button>
        </div>

        <div className="card p-6 fadein-2">
          <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold"><Monitor size={20} /></span>
            <h3 className="font-display text-xl text-gold">Recent Logins</h3></div>
          <div className="mt-4 divide-y divide-white/5 max-h-80 overflow-y-auto">
            {logins.map(l => (
              <div key={l._id} className="py-3 text-sm">
                <div className="flex justify-between"><span className="text-cream">{l.ip || "unknown IP"}</span><span className="text-cream/40">{new Date(l.createdAt).toLocaleString()}</span></div>
                <div className="text-xs text-cream/40 truncate">{l.userAgent || ""}</div>
              </div>
            ))}
            {!logins.length && <div className="py-6 text-center text-cream/50 text-sm">No login records yet.</div>}
          </div>
        </div>
      </div>

      <div className="card p-5 flex items-start gap-3 text-sm text-cream/60 fadein-3">
        <Shield size={18} className="text-gold mt-0.5 shrink-0" />
        Never share your password or verification code. Shein staff will never ask for them.
      </div>
    </div>
  );
}
