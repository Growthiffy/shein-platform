const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4001";
function token() { return typeof window === "undefined" ? null : localStorage.getItem("shein_admin_token"); }
export function setToken(t) { if (t) localStorage.setItem("shein_admin_token", t); else localStorage.removeItem("shein_admin_token"); }
export function getToken() { return token(); }
export async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const t = token(); if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}
