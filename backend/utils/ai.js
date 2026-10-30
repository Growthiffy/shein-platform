// Thin, hard-guarded Gemini client. Every feature that uses it MUST treat a null
// return as "no AI available" and fall back to static content, so the platform
// never depends on AI and never breaks when it is off or rate-limited.
//
// Free-tier protection, in priority order:
//   1. Disabled unless GEMINI_API_KEY is set.
//   2. Cheapest/fastest model (gemini-2.0-flash-lite) + tiny maxOutputTokens.
//   3. In-process response cache so identical prompts cost one call.
//   4. In-process daily call budget (AI_DAILY_BUDGET, default 300) — refuses once hit.
//   5. Short timeout so a slow/hung call never blocks a request.
//
// Note: counters are per process (reset on serverless cold start). Combined with
// a conservative budget and caching this keeps usage well under free limits.

const API_KEY = () => process.env.GEMINI_API_KEY || "";
const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const DAILY_BUDGET = () => Number(process.env.AI_DAILY_BUDGET || 300);
const TIMEOUT_MS = 4000;
const CACHE_MAX = 500;

const cache = new Map();          // prompt key -> text
let day = null;                   // YYYY-MM-DD
let callsToday = 0;

function todayKey() { return new Date().toISOString().slice(0, 10); }
function rollDay() {
  const t = todayKey();
  if (t !== day) { day = t; callsToday = 0; }
}

function aiEnabled() { return !!API_KEY(); }

function budgetLeft() { rollDay(); return Math.max(0, DAILY_BUDGET() - callsToday); }

function cacheGet(k) {
  if (!cache.has(k)) return undefined;
  const v = cache.get(k);
  cache.delete(k); cache.set(k, v); // bump LRU
  return v;
}
function cacheSet(k, v) {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

// Returns a trimmed string, or null on any failure / disabled / over budget.
// opts: { maxTokens, temperature, cacheKey, system }
async function generate(prompt, opts = {}) {
  if (!aiEnabled() || !prompt) return null;

  const key = opts.cacheKey || `${MODEL()}::${opts.maxTokens || 0}::${prompt}`;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;

  rollDay();
  if (callsToday >= DAILY_BUDGET()) return null;
  callsToday++;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: Math.min(Math.max(Number(opts.maxTokens || 80), 1), 512),
      temperature: opts.temperature ?? 0.9,
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent?key=${encodeURIComponent(API_KEY())}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) { return null; }
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "").join("").trim();
    if (!text) return null;
    cacheSet(key, text);
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generate, aiEnabled, budgetLeft };
