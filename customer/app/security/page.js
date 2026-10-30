"use client";
import { useEffect, useState } from "react";
import AppShell, { useMe } from "@/components/AppShell";
import { api, setToken } from "@/lib/api";
import { useToast } from "@/components/Toast";
import QRCode from "qrcode";
import { Shield, KeyRound, Monitor, Mail, Wallet, Smartphone } from "lucide-react";

export default function SecurityPage() { return <AppShell><Body /></AppShell>; }

function Body() {
  const { me, refresh } = useMe();
  const toast = useToast();
  const [logins, setLogins] = useState([]);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [phish, setPhish] = useState("");
  const [twoFa, setTwoFa] = useState(null); // { secret, otpauth, qr }
  const [twoFaCode, setTwoFaCode] = useState("");

  function loadSessions() { api("/api/me/sessions").then(d => setLogins(d.sessions)).catch(() => {}); }
  useEffect(() => { loadSessions(); }, []);

  async function changePw() {
    setMsg(""); setBusy(true);
    try { await api("/api/me/password", { method: "POST", body: { current: cur, next } }); setCur(""); setNext(""); setMsg("✓ Password updated"); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function savePhish() {
    try { await api("/api/me/anti-phish", { method: "POST", body: { code: phish } }); await refresh(); setPhish(""); toast({ text: "Security phrase saved", type: "success" }); }
    catch (e) { toast({ text: e.message, type: "error" }); }
  }
  async function toggleAlerts(enabled) {
    try { await api("/api/me/login-alerts", { method: "POST", body: { enabled } }); await refresh(); }
    catch (e) { toast({ text: e.message, type: "error" }); }
  }
  async function revokeAll() {
    try { const d = await api("/api/me/sessions/revoke-all", { method: "POST" }); if (d.token) setToken(d.token); loadSessions(); toast({ text: "Signed out of all other devices", type: "success" }); }
    catch (e) { toast({ text: e.message, type: "error" }); }
  }
  async function start2fa() {
    try { const d = await api("/api/me/2fa/setup", { method: "POST" }); const qr = await QRCode.toDataURL(d.otpauth, { margin: 1, width: 200 }).catch(() => ""); setTwoFa({ ...d, qr }); }
    catch (e) { toast({ text: e.message, type: "error" }); }
  }
  async function enable2fa() {
    try { await api("/api/me/2fa/enable", { method: "POST", body: { token: twoFaCode.trim() } }); await refresh(); setTwoFa(null); setTwoFaCode(""); toast({ text: "Two-factor enabled", type: "success" }); }
    catch (e) { toast({ text: e.message, type: "error" }); }
  }
  async function disable2fa() {
    try { await api("/api/me/2fa/disable", { method: "POST" }); await refresh(); toast({ text: "Two-factor disabled", type: "info" }); }
    catch (e) { toast({ text: e.message, type: "error" }); }
  }

  const wallets = me.payoutWallets || [];

  return (
    <div className="page space-y-6">
      <h1 className="font-display text-3xl md:text-4xl text-gold">Security</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Password */}
        <div className="card p-6 fadein">
          <Head icon={KeyRound} title="Change Password" />
          <label className="block mt-4"><span className="label">Current Password</span>
            <input type="password" className="field mt-1" value={cur} onChange={e => setCur(e.target.value)} /></label>
          <label className="block mt-3"><span className="label">New Password (min 8)</span>
            <input type="password" className="field mt-1" value={next} onChange={e => setNext(e.target.value)} /></label>
          {msg && <div className={`mt-2 text-sm ${msg.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>{msg}</div>}
          <button className="btn-gold mt-4 w-full" onClick={changePw} disabled={busy || !cur || next.length < 8}>UPDATE PASSWORD</button>
        </div>

        {/* Anti-phishing */}
        <div className="card p-6 fadein-2">
          <Head icon={Mail} title="Anti-Phishing Code" />
          <p className="text-sm text-cream/55 mt-2">This phrase appears in every email from Shein, proving the email is genuine.</p>
          <div className="mt-3 flex gap-2">
            <input className="field" placeholder={me.antiPhishSet ? "•••••• (set)" : "e.g. golden-lion"} value={phish} onChange={e => setPhish(e.target.value)} />
            <button className="btn-gold px-4" onClick={savePhish} disabled={!phish.trim()}>Save</button>
          </div>
          {me.antiPhishSet && <div className="text-xs text-emerald-500 mt-1">A security phrase is set.</div>}
        </div>

        {/* Withdrawal whitelist */}
        <div className="card p-6 fadein">
          <Head icon={Wallet} title="Withdrawal Addresses" />
          <p className="text-sm text-cream/55 mt-2">New addresses have a 24-hour security hold for your protection.</p>
          <div className="mt-3 space-y-2">
            {wallets.map((w, i) => <WalletRow key={i} w={w} />)}
            {!wallets.length && <div className="text-sm text-cream/50">No saved addresses. Add one on the Withdraw page.</div>}
          </div>
        </div>

        {/* Login alerts + sessions */}
        <div className="card p-6 fadein-2">
          <Head icon={Monitor} title="Devices & Alerts" />
          <label className="mt-3 flex items-center justify-between text-sm">
            <span className="text-cream/75">Email me when a new device signs in</span>
            <input type="checkbox" checked={me.loginAlerts !== false} onChange={e => toggleAlerts(e.target.checked)} />
          </label>
          <div className="mt-3 divide-y divide-black/[0.06] max-h-56 overflow-y-auto">
            {logins.map(l => (
              <div key={l.id} className="py-2.5 text-sm">
                <div className="flex justify-between"><span className="text-cream">{l.ip || "unknown IP"}</span><span className="text-cream/40">{new Date(l.at).toLocaleString()}</span></div>
                <div className="text-xs text-cream/40 truncate">{l.userAgent || ""}</div>
              </div>
            ))}
            {!logins.length && <div className="py-4 text-center text-cream/50 text-sm">No sessions yet.</div>}
          </div>
          <button className="btn-outline mt-3 w-full text-sm" onClick={revokeAll}>Sign out all other devices</button>
        </div>

        {/* Two-factor */}
        <div className="card p-6 fadein lg:col-span-2">
          <Head icon={Smartphone} title="Two-Factor Authentication" />
          {me.twoFactorEnabled ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-emerald-500">Two-factor authentication is enabled.</span>
              <button className="btn-outline text-sm" onClick={disable2fa}>Disable</button>
            </div>
          ) : twoFa ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-[200px_1fr] items-start">
              {twoFa.qr && <img src={twoFa.qr} alt="2FA QR" className="rounded-lg border border-line bg-white p-1" width={180} height={180} />}
              <div>
                <p className="text-sm text-cream/65">Scan the QR with your authenticator app, or enter this secret manually:</p>
                <div className="font-mono text-sm text-gold break-all mt-1">{twoFa.secret}</div>
                <label className="block mt-3"><span className="label">Enter 6-digit code to confirm</span>
                  <input className="field mt-1" value={twoFaCode} onChange={e => setTwoFaCode(e.target.value)} /></label>
                <button className="btn-gold mt-3" onClick={enable2fa} disabled={twoFaCode.trim().length < 6}>Enable 2FA</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-cream/65">Add an extra layer of protection with an authenticator app.</span>
              <button className="btn-gold text-sm" onClick={start2fa}>Set up</button>
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 flex items-start gap-3 text-sm text-cream/60">
        <Shield size={18} className="text-gold mt-0.5 shrink-0" />
        Never share your password or verification code. Shein staff will never ask for them.
      </div>
    </div>
  );
}

function Head({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/10 text-gold"><Icon size={20} /></span>
      <h3 className="font-display text-xl text-gold">{title}</h3>
    </div>
  );
}

function WalletRow({ w }) {
  const held = w.active === false;
  const until = held && w.addedAt ? new Date(new Date(w.addedAt).getTime() + 24 * 3600 * 1000) : null;
  const [left, setLeft] = useState(() => until ? Math.max(0, until - Date.now()) : 0);
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setLeft(Math.max(0, until - Date.now())), 1000);
    return () => clearInterval(t);
  }, [until?.getTime?.()]);
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
  return (
    <div className="p-2.5 rounded-lg border border-line bg-ink2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-cream/50">{w.chain} · {w.label || "wallet"}</div>
        {held ? <span className="text-xs text-amber-600">24h hold · {h}h {m}m left</span>
          : <span className="text-xs text-emerald-500">Active</span>}
      </div>
      <div className="text-sm text-cream break-all">{w.address}</div>
    </div>
  );
}
