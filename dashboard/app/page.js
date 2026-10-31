"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
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
        <label className="label block">Password
          <div className="relative mt-1">
            <input type={show ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full pr-10" />
            <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-2 flex items-center text-cream/50 hover:text-gold">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="btn w-full mt-1">Sign In</button>
      </form>
    </main>
  );
}
