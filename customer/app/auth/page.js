"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function AuthPage() {
  const [mode, setMode] = useState("choose"); // choose | signin | signup | verify
  const [devCode, setDevCode] = useState("");
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-4" style={{backgroundImage:"radial-gradient(ellipse at top, rgba(201,162,74,.08), transparent 60%)"}}>
      <div className="card w-full max-w-md p-8">
        {mode === "choose" && <Choose onPick={setMode} />}
        {mode === "signin" && <SignIn onSwitch={() => setMode("signup")} onNeedsVerify={() => setMode("verify")} />}
        {mode === "signup" && <SignUp onNeedsVerify={(c) => { setDevCode(c || ""); setMode("verify"); }} onSwitch={() => setMode("signin")} />}
        {mode === "verify" && <Verify devCode={devCode} />}
      </div>
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
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const d = await api("/api/auth/login", { method: "POST", body: { email, password } });
      setToken(d.token); r.push("/dashboard");
    } catch (e) {
      // Backend signals an unverified account; route the user to verification.
      if (/verify email/i.test(e.message)) { sessionStorage.setItem("shein_pending_email", email); onNeedsVerify(); return; }
      setErr(e.message);
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-2xl text-gold text-center">Sign In</h2>
      <Input label="Email" value={email} onChange={setEmail} type="email" />
      <Input label="Password" value={password} onChange={setPassword} type="password" />
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <button className="btn-gold w-full" disabled={busy}>{busy ? "..." : "SIGN IN"}</button>
      <div className="text-center text-sm text-cream/60">
        New here? <button type="button" className="text-gold underline" onClick={onSwitch}>Create account</button>
      </div>
    </form>
  );
}

function SignUp({ onNeedsVerify, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr("");
    if (password.length < 8) { setErr("password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const d = await api("/api/auth/signup", { method: "POST", body: { email, password } });
      sessionStorage.setItem("shein_pending_email", email.trim().toLowerCase());
      onNeedsVerify(d.devCode);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-2xl text-gold text-center">Create Account</h2>
      <Input label="Real email address" value={email} onChange={setEmail} type="email" />
      <Input label="Password (min 8 chars)" value={password} onChange={setPassword} type="password" />
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

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-xs text-cream/60 mb-1 tracking-widest uppercase">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-black/40 border border-gold/20 rounded-lg px-4 py-3 text-cream focus:border-gold outline-none" required />
    </label>
  );
}
