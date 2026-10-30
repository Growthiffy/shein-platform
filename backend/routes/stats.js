const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
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
  // Smooth bell peaking ~14:00.
  const x = (hour - 14) / 7;
  return 0.35 + 0.65 * Math.exp(-0.5 * x * x);
}

// GET /api/stats/public — fabricated but plausible live counters.
router.get("/public", auth, async (req, res) => {
  const s = await getSettings(["platformMemberCount"]);
  const total = Number(s.platformMemberCount) || 12847;

  const now = new Date();
  const hour = now.getHours();
  const rng = mulberry32(Math.floor(now.getTime() / (60 * 1000))); // changes each minute, stable within it
  const jitter = 1 + (rng() - 0.5) * 0.1; // ±5%
  const onlineMembers = Math.max(1, Math.round(total * timeOfDayFactor(hour) * 0.18 * jitter));

  // Total payouts: real earnings/withdrawals + a platform baseline so it reads large.
  const agg = await Transaction.aggregate([
    { $match: { type: { $in: ["withdrawal", "salary", "commission", "invest_payout", "reward"] }, status: { $in: ["approved", "complete"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalPayouts = Math.round(47_000_000 + (agg[0]?.total || 0));

  res.json({ onlineMembers, totalAnalysts: total, totalPayouts });
});

module.exports = router;
