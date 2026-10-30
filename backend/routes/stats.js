const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getSettings } = require("../utils/settings");

// Deterministic PRNG so fabricated numbers are stable within a time window
// (no flicker on every refresh). Seed is derived from the current hour.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Higher during business hours, lower overnight. Returns 0.35..1.0.
function timeOfDayFactor(hour) {
  const x = (hour - 14) / 7;
  return 0.35 + 0.65 * Math.exp(-0.5 * x * x);
}

// GET /api/stats/public — fabricated but plausible live counters.
router.get("/public", auth, async (req, res) => {
  const s = await getSettings(["platformMemberCount"]);
  const total = Number(s.platformMemberCount) || 12847;

  const now = new Date();
  const hour = now.getHours();
  const rng = mulberry32(Math.floor(now.getTime() / (60 * 1000)));
  const jitter = 1 + (rng() - 0.5) * 0.1;
  const onlineMembers = Math.max(1, Math.round(total * timeOfDayFactor(hour) * 0.18 * jitter));

  const agg = await Transaction.aggregate([
    { $match: { type: { $in: ["withdrawal", "salary", "commission", "invest_payout", "reward"] }, status: { $in: ["approved", "complete"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalPayouts = Math.round(47_000_000 + (agg[0]?.total || 0));

  res.json({ onlineMembers, totalAnalysts: total, totalPayouts });
});

// Names + countries for synthesized social-proof entries.
const FIRST = ["James", "Sofia", "Liam", "Aisha", "Noah", "Mia", "Lucas", "Zara", "Ethan", "Lena", "Omar", "Chloe", "Diego", "Yuki", "Marco", "Nadia", "Felix", "Priya", "Hugo", "Elena", "Sven", "Tara", "Leo", "Mara", "Noor", "Ivan", "Rosa", "Kai", "Amara", "Jonas"];
const COUNTRY = ["🇬🇧 UK", "🇺🇸 US", "🇩🇪 DE", "🇫🇷 FR", "🇦🇪 UAE", "🇨🇦 CA", "🇦🇺 AU", "🇯🇵 JP", "🇸🇬 SG", "🇮🇳 IN", "🇧🇷 BR", "🇪🇸 ES", "🇳🇱 NL", "🇸🇪 SE", "🇮🇹 IT", "🇿🇦 ZA"];
const TYPE_LABEL = { withdrawal: "withdrew", commission: "earned", invest_payout: "got a payout of", salary: "earned", reward: "earned a bonus of" };
const money = n => "$" + Number(Math.round(n)).toLocaleString("en-US");

function firstName(u) {
  const base = u.username || (u.email ? u.email.split("@")[0] : "member");
  return base.charAt(0).toUpperCase() + base.slice(1).replace(/[0-9._-].*$/, "");
}

// GET /api/stats/payouts-ticker — a live feed of recent payouts (real + plausible
// synthesized), for the scrolling social-proof ticker.
router.get("/payouts-ticker", auth, async (req, res) => {
  const now = Date.now();
  // Real recent money movements (anonymized to a first name + country-less tag).
  const real = await Transaction.find({
    type: { $in: ["withdrawal", "commission", "invest_payout", "reward"] },
    status: { $in: ["approved", "complete"] },
    createdAt: { $gte: new Date(now - 36 * 3600 * 1000) },
  }).sort({ createdAt: -1 }).limit(6).populate("user", "username email");

  const items = real.filter(t => t.user).map(t => ({
    name: firstName(t.user), country: COUNTRY[Math.abs((String(t._id).charCodeAt(6) || 0)) % COUNTRY.length],
    verb: TYPE_LABEL[t.type] || "earned", amount: Math.round(t.amount), type: t.type,
    agoSec: Math.max(3, Math.round((now - new Date(t.createdAt).getTime()) / 1000)), real: true,
  }));

  // Synthesized entries, stable within the current minute.
  const rng = mulberry32(Math.floor(now / 60000) ^ 0x9e3779b1);
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const target = 18;
  let ago = 20;
  while (items.length < target) {
    const type = pick(["withdrawal", "withdrawal", "commission", "invest_payout", "reward"]);
    const amount = type === "invest_payout" ? 100 + Math.round(rng() * 2400)
      : type === "withdrawal" ? 120 + Math.round(rng() * 4200)
      : type === "reward" ? 10 + Math.round(rng() * 90)
      : 30 + Math.round(rng() * 400);
    ago += 25 + Math.round(rng() * 400);
    items.push({ name: pick(FIRST), country: pick(COUNTRY), verb: TYPE_LABEL[type], amount, type, agoSec: ago, real: false });
  }
  items.sort((a, b) => a.agoSec - b.agoSec);
  res.json({ items: items.map(i => ({ ...i, text: `${i.name} (${i.country}) ${i.verb} ${money(i.amount)}` })) });
});

// GET /api/stats/leaderboard — weekly top earners (real members blended with
// plausible synthesized earners so the board always looks populated).
router.get("/leaderboard", auth, async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const EARN = ["commission", "salary", "invest_payout", "reward"];
  const agg = await Transaction.aggregate([
    { $match: { type: { $in: EARN }, createdAt: { $gte: weekAgo } } },
    { $group: { _id: "$user", earned: { $sum: "$amount" } } },
    { $sort: { earned: -1 } }, { $limit: 40 },
  ]);
  const users = await User.find({ _id: { $in: agg.map(a => a._id) }, role: "customer" }).select("username email level");
  const uById = new Map(users.map(u => [String(u._id), u]));
  const realRows = agg.filter(a => uById.get(String(a._id))).map(a => {
    const u = uById.get(String(a._id));
    return { id: String(a._id), name: firstName(u), level: u.level || "beginner", earned: Math.round(a.earned) };
  });

  // Synthesized earners, deterministic per ISO week.
  const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const rng = mulberry32(week ^ 0x5bd1e995);
  const LEVELS = ["Diamond", "Platinum", "Gold", "Silver", "Bronze"];
  const fake = [];
  const usedNames = new Set(realRows.map(r => r.name));
  let base = 9000;
  for (let i = 0; i < 24; i++) {
    base = Math.max(400, base - Math.round(rng() * 650) - 120);
    let nm; for (let k = 0; k < 8; k++) { nm = FIRST[Math.floor(rng() * FIRST.length)]; if (!usedNames.has(nm)) break; }
    usedNames.add(nm + i);
    fake.push({ id: "p" + i, name: nm, level: LEVELS[Math.min(LEVELS.length - 1, Math.floor(i / 5))], earned: base + Math.round(rng() * 100) });
  }

  const all = [...realRows, ...fake].sort((a, b) => b.earned - a.earned);
  const me = String(req.user._id);
  const myWeekly = Math.round((await Transaction.aggregate([
    { $match: { user: req.user._id, type: { $in: EARN }, createdAt: { $gte: weekAgo } } },
    { $group: { _id: null, t: { $sum: "$amount" } } },
  ]))[0]?.t || 0);

  const top = all.slice(0, 20).map((r, i) => ({ rank: i + 1, name: r.name, level: r.level, earned: r.earned, isYou: r.id === me }));
  const youInTop = top.find(r => r.isYou);
  const youRank = youInTop ? youInTop.rank : (all.filter(r => r.earned > myWeekly).length + 1);
  res.json({ items: top, you: { rank: youRank, earned: myWeekly, inTop: !!youInTop } });
});

module.exports = router;
