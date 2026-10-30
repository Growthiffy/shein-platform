"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import Footer from "@/components/Footer";

export default function AuthPage() {
  const r = useRouter();
  const [mode, setMode] = useState("choose"); // choose | signin | signup | verify
  const [devCode, setDevCode] = useState("");
  const [ref, setRef] = useState("");
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      // Admin "login as" hand-off: a one-time member token in ?as= signs in here.
      const as = p.get("as");
      if (as) { setToken(as); r.replace("/dashboard"); return; }
      const rc = p.get("ref"); if (rc) { setRef(rc.toUpperCase()); setMode("signup"); }
    } catch {}
  }, []);
  return (
    <main className="min-h-screen flex flex-col bg-ink" style={{backgroundImage:"radial-gradient(ellipse at top, rgba(201,162,74,.1), transparent 60%)"}}>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="font-display text-4xl tracking-[0.3em] text-gold mb-1">SHEIN</div>
        <div className="text-[11px] tracking-[0.35em] text-cream/50 mb-8">LUXURY · ANALYSIS · GROWTH</div>
        <div className="card w-full max-w-md p-8">
          {mode === "choose" && <Choose onPick={setMode} />}
          {mode === "signin" && <SignIn onSwitch={() => setMode("signup")} onNeedsVerify={() => setMode("verify")} />}
          {mode === "signup" && <SignUp ref0={ref} onNeedsVerify={(c) => { setDevCode(c || ""); setMode("verify"); }} onSwitch={() => setMode("signin")} />}
          {mode === "verify" && <Verify devCode={devCode} />}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function Choose({ onPick }) {
  return (
    <>
      <h2 className="font-display text-3xl text-gold text-center mb-6">Welcome</h2>
      <p className="text-center text-cream/70 mb-8">Are you joining Shein, or returning?</p>
      <div className="flex gap-3">
        <button className="btn-gold flex-1" onClick={() => onPick("signup")}>CREATE ACCOUNT</button>
        <button className="flex-1 py-3 rounded-full border border-gold/40 text-cream" onClick={() => onPick("signin")}>SIGN IN</button>
      </div>
    </>
  );
}

function SignIn({ onSwitch, onNeedsVerify }) {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFA, setTwoFA] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const body = { email, password };
      if (twoFA) body.token = otp.trim();
      const d = await api("/api/auth/login", { method: "POST", body });
      setToken(d.token); r.push("/dashboard");
    } catch (e) {
      // Backend signals an unverified account; route the user to verification.
      if (/verify email/i.test(e.message)) { sessionStorage.setItem("shein_pending_email", email); onNeedsVerify(); return; }
      // Account has 2FA — reveal the code field and ask for it.
      if (/2fa/i.test(e.message)) { setTwoFA(true); setErr(/required/i.test(e.message) ? "" : e.message); return; }
      setErr(e.message);
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-2xl text-gold text-center">Sign In</h2>
      <Input label="Email" value={email} onChange={setEmail} type="email" />
      <Input label="Password" value={password} onChange={setPassword} type="password" />
      {twoFA && <Input label="2FA code" value={otp} onChange={setOtp} />}
      {twoFA && !err && <div className="text-cream/60 text-sm">Enter the 6-digit code from your authenticator app.</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <button className="btn-gold w-full" disabled={busy}>{busy ? "..." : (twoFA ? "VERIFY & SIGN IN" : "SIGN IN")}</button>
      <div className="text-center text-sm text-cream/60">
        New here? <button type="button" className="text-gold underline" onClick={onSwitch}>Create account</button>
      </div>
    </form>
  );
}

function SignUp({ onNeedsVerify, onSwitch, ref0 }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ref, setRef] = useState(ref0 || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr("");
    if (password.length < 8) { setErr("password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const d = await api("/api/auth/signup", { method: "POST", body: { email, password, ref: ref.trim() || undefined } });
      sessionStorage.setItem("shein_pending_email", email.trim().toLowerCase());
      onNeedsVerify(d.devCode);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-2xl text-gold text-center">Create Account</h2>
      {ref0 && <div className="text-center text-sm text-emerald-400">Invited with code {ref0} — $20 reward on verify.</div>}
      <Input label="Real email address" value={email} onChange={setEmail} type="email" />
      <Input label="Password (min 8 chars)" value={password} onChange={setPassword} type="password" />
      <Input label="Referral code (optional)" value={ref} onChange={setRef} required={false} />
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <button className="btn-gold w-full" disabled={busy}>{busy ? "..." : "SEND CODE"}</button>
      <div className="text-center text-sm text-cream/60">
        Have an account? <button type="button" className="text-gold underline" onClick={onSwitch}>Sign in</button>
      </div>
    </form>
  );
}

function Verify({ devCode }) {
  const r = useRouter();
  const [code, setCode] = useState(devCode || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(devCode ? `Dev mode: your code is ${devCode}` : "");
  const [cooldown, setCooldown] = useState(0);
  const email = typeof window !== "undefined" ? sessionStorage.getItem("shein_pending_email") || "" : "";

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const d = await api("/api/auth/verify", { method: "POST", body: { email, code: code.trim() } });
      setToken(d.token); r.push("/dashboard");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function resend() {
    setErr(""); setNote("");
    try {
      const d = await api("/api/auth/resend", { method: "POST", body: { email } });
      setCooldown(30);
      setNote(d.devCode ? `Dev mode: your code is ${d.devCode}` : "New code sent. Check your email.");
      if (d.devCode) setCode(d.devCode);
    } catch (e) { setErr(e.message); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-2xl text-gold text-center">Verify Email</h2>
      <p className="text-cream/70 text-center text-sm">Code sent to <b>{email}</b></p>
      <Input label="6-digit code" value={code} onChange={setCode} />
      {note && <div className="text-gold/80 text-sm text-center">{note}</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <button className="btn-gold w-full" disabled={busy}>{busy ? "..." : "VERIFY"}</button>
      <div className="text-center text-sm text-cream/60">
        Didn&apos;t get it?{" "}
        <button type="button" disabled={cooldown > 0} className="text-gold underline disabled:opacity-40" onClick={resend}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, type = "text", required = true }) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="field" required={required} />
    </label>
  );
}
