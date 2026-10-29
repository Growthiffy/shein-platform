"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault(); setErr("");
    try {
      const d = await api("/api/auth/login", { method: "POST", body: { email, password } });
      if (!(d.user.isAdmin || d.user.role === "admin")) { setErr("not an admin account"); return; }
      setToken(d.token); r.push("/overview");
    } catch (e) { setErr(e.message); }
  }
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-ink px-4" style={{backgroundImage:"radial-gradient(ellipse at top, rgba(201,162,74,.1), transparent 60%)"}}>
      <div className="font-display text-3xl tracking-widest text-gold mb-6">SHEIN · Admin</div>
      <form onSubmit={submit} className="card p-8 w-full max-w-sm space-y-3">
        <label className="label block">Email<input placeholder="admin@shein.local" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1" /></label>
        <label className="label block">Password<input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1" /></label>
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn w-full mt-1">Sign In</button>
      </form>
    </main>
  );
}
