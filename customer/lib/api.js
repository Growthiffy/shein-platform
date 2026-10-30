const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4001";

function token() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shein_token");
}

export async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status; err.data = data;
    throw err;
  }
  return data;
}

export function setToken(t) { if (t) localStorage.setItem("shein_token", t); else localStorage.removeItem("shein_token"); }
export function getToken() { return token(); }
