// API calls stay same-origin: next.config.mjs rewrites /api/* to the backend.
// A direct cross-origin call fails with "Failed to fetch" when Vercel challenges
// the visitor's IP, because the preflight is blocked without CORS headers.
const CHALLENGE_RELOAD_KEY = "shein_admin_challenge_reload";
const CHALLENGE_RELOAD_COOLDOWN_MS = 60 * 1000;

function token() { return typeof window === "undefined" ? null : localStorage.getItem("shein_admin_token"); }
export function setToken(t) { if (t) localStorage.setItem("shein_admin_token", t); else localStorage.removeItem("shein_admin_token"); }
export function getToken() { return token(); }

// An expired Vercel checkpoint cookie blocks API calls until a page load passes
// the checkpoint again. Reload at most once per cooldown to prevent a reload loop.
function reloadForChallenge() {
  let last = 0;
  try { last = Number(sessionStorage.getItem(CHALLENGE_RELOAD_KEY)) || 0; } catch {}
  if (Date.now() - last < CHALLENGE_RELOAD_COOLDOWN_MS) return;
  try { sessionStorage.setItem(CHALLENGE_RELOAD_KEY, String(Date.now())); } catch {}
  window.location.reload();
}

export async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const t = token(); if (t) headers.Authorization = `Bearer ${t}`;
  let res;
  try {
    res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  if (res.status === 403 && res.headers.get("x-vercel-mitigated") === "challenge") {
    reloadForChallenge();
    throw new Error("Security check needed. Reload the page and try again.");
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}
