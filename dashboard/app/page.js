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
      if (!d.user.isAdmin) { setErr("not an admin account"); return; }
      setToken(d.token); r.push("/users");
    } catch (e) { setErr(e.message); }
  }
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink">
      <form onSubmit={submit} className="card p-8 w-full max-w-sm space-y-3">
        <h1 className="text-2xl text-gold">Shein Admin</h1>
        <input placeholder="admin email" value={email} onChange={e => setEmail(e.target.value)} className="w-full" />
        <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full" />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn w-full">Sign In</button>
      </form>
    </main>
  );
}
