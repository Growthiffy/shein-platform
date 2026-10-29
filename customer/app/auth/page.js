"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function AuthPage() {
  const [mode, setMode] = useState("choose"); // choose | signin | signup | verify
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-4" style={{backgroundImage:"radial-gradient(ellipse at top, rgba(201,162,74,.08), transparent 60%)"}}>
      <div className="card w-full max-w-md p-8">
        {mode === "choose" && <Choose onPick={setMode} />}
        {mode === "signin" && <SignIn onSwitch={() => setMode("signup")} />}
        {mode === "signup" && <SignUp onNeedsVerify={() => setMode("verify")} onSwitch={() => setMode("signin")} />}
        {mode === "verify" && <Verify />}
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

function SignIn({ onSwitch }) {
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
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
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
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await api("/api/auth/signup", { method: "POST", body: { email, password } });
      sessionStorage.setItem("shein_pending_email", email);
      onNeedsVerify();
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

function Verify() {
  const r = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const email = typeof window !== "undefined" ? sessionStorage.getItem("shein_pending_email") || "" : "";
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const d = await api("/api/auth/verify", { method: "POST", body: { email, code } });
      setToken(d.token); r.push("/dashboard");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="font-display text-2xl text-gold text-center">Verify Email</h2>
      <p className="text-cream/70 text-center text-sm">Code sent to <b>{email}</b></p>
      <Input label="6-digit code" value={code} onChange={setCode} />
      {err && <div className="text-red-400 text-sm">{err}</div>}
      <button className="btn-gold w-full" disabled={busy}>{busy ? "..." : "VERIFY"}</button>
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
