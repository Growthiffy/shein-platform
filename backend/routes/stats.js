const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getSettings } = require("../utils/settings");
const { identity, fakeAddress, selfIdentity } = require("../utils/fakeIdentities");

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

const TYPE_LABEL = { withdrawal: "withdrew", commission: "earned", invest_payout: "got a payout of", salary: "earned", reward: "earned a bonus of" };
const money = n => "$" + Number(Math.round(n)).toLocaleString("en-US");
const countryStr = id => `${id.flag} ${id.country}`;

// GET /api/stats/payouts-ticker — a live feed of recent payouts for the scrolling
// social-proof ticker. A member sees only THEIR OWN real payouts (never other real
// members); the rest are fabricated identities from the weighted pool.
router.get("/payouts-ticker", auth, async (req, res) => {
  const now = Date.now();
  const self = selfIdentity(req.user);

  // The current member's own recent money movements (real name, avatar, address).
  const mine = await Transaction.find({
    user: req.user._id,
    type: { $in: ["withdrawal", "commission", "invest_payout", "reward"] },
    status: { $in: ["approved", "complete"] },
    createdAt: { $gte: new Date(now - 36 * 3600 * 1000) },
  }).sort({ createdAt: -1 }).limit(4);

  const items = mine.map(t => ({
    name: self.name, avatar: self.avatar, flag: self.flag, country: countryStr(self),
    verb: TYPE_LABEL[t.type] || "earned", amount: Math.round(t.amount), type: t.type,
    address: t.address || fakeAddress(String(t._id)),
    agoSec: Math.max(3, Math.round((now - new Date(t.createdAt).getTime()) / 1000)), real: true,
  }));

  // Fabricated entries from the weighted pool, stable within the current minute.
  const rng = mulberry32(Math.floor(now / 60000) ^ 0x9e3779b1);
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const target = 18;
  let ago = 20;
  let n = Math.floor(rng() * 1e9);
  while (items.length < target) {
    const type = pick(["withdrawal", "withdrawal", "commission", "invest_payout", "reward"]);
    const amount = type === "invest_payout" ? 100 + Math.round(rng() * 2400)
      : type === "withdrawal" ? 120 + Math.round(rng() * 4200)
      : type === "reward" ? 10 + Math.round(rng() * 90)
      : 30 + Math.round(rng() * 400);
    ago += 25 + Math.round(rng() * 400);
    const id = identity(n += 7919);
    items.push({
      name: id.name, avatar: id.avatar, flag: id.flag, country: countryStr(id),
      verb: TYPE_LABEL[type], amount, type, address: fakeAddress(id.id + ":" + ago), agoSec: ago, real: false,
    });
  }
  items.sort((a, b) => a.agoSec - b.agoSec);
  res.json({ items: items.map(i => ({ ...i, text: `${i.name} (${i.country}) ${i.verb} ${money(i.amount)}` })) });
});

// GET /api/stats/leaderboard — weekly top earners. A member sees only THEMSELF
// among real people; every other row is a fabricated earner from the weighted pool
// (deterministic per week), so no member sees another real member here.
router.get("/leaderboard", auth, async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const EARN = ["commission", "salary", "invest_payout", "reward"];

  // Fabricated earners, deterministic per ISO week, descending.
  const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
  const rng = mulberry32(week ^ 0x5bd1e995);
  const LEVELS = ["Diamond", "Platinum", "Gold", "Silver", "Bronze"];
  const fake = [];
  let base = 9000;
  let n = Math.floor(rng() * 1e9);
  for (let i = 0; i < 30; i++) {
    base = Math.max(400, base - Math.round(rng() * 650) - 120);
    const id = identity(n += 104729);
    fake.push({
      id: id.id, name: id.name, avatar: id.avatar, flag: id.flag, country: id.country,
      level: LEVELS[Math.min(LEVELS.length - 1, Math.floor(i / 6))], earned: base + Math.round(rng() * 100),
    });
  }

  const self = selfIdentity(req.user);
  const me = String(req.user._id);
  const myWeekly = Math.round((await Transaction.aggregate([
    { $match: { user: req.user._id, type: { $in: EARN }, createdAt: { $gte: weekAgo } } },
    { $group: { _id: null, t: { $sum: "$amount" } } },
  ]))[0]?.t || 0);

  const youRow = {
    id: me, name: self.name, avatar: self.avatar, flag: self.flag, country: self.country,
    level: req.user.level || "beginner", earned: myWeekly,
  };
  const all = [...fake, youRow].sort((a, b) => b.earned - a.earned);

  const top = all.slice(0, 20).map((r, i) => ({
    rank: i + 1, name: r.name, avatar: r.avatar, flag: r.flag, country: r.country,
    level: r.level, earned: r.earned, isYou: r.id === me,
  }));
  const youInTop = top.find(r => r.isYou);
  const youRank = youInTop ? youInTop.rank : (all.filter(r => r.earned > myWeekly).length + 1);
  res.json({ items: top, you: { rank: youRank, earned: myWeekly, inTop: !!youInTop } });
});

module.exports = router;
