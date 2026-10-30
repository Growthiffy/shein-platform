const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getSettings } = require("../utils/settings");

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function timeAgo(date) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return `${s} sec ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const TYPE_MAP = {
  deposit:        { type: "deposit_approved" },
  withdrawal:     { type: "withdrawal_complete" },
  invest_lock:    { type: "invest_start" },
  commission:     { type: "analysis_complete" },
};

// GET /api/activity/feed — recent anonymized real activity, padded with
// deterministic filler (seeded by the hour) so the feed stays lively but stable.
router.get("/feed", auth, async (req, res) => {
  const s = await getSettings(["activityFeedEnabled"]);
  if (s.activityFeedEnabled === false) return res.json({ items: [], enabled: false });

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const txs = await Transaction.find({
    createdAt: { $gte: since },
    type: { $in: ["deposit", "withdrawal", "invest_lock", "commission"] },
    status: { $in: ["approved", "complete"] },
  }).sort({ createdAt: -1 }).limit(20).populate("user", "accountNumber");

  const real = txs.map(t => ({
    type: TYPE_MAP[t.type].type,
    memberNumber: t.user?.accountNumber || (1000 + (String(t.user?._id || "").slice(-3).split("").reduce((a, c) => a + c.charCodeAt(0), 0))),
    amount: Math.round(t.amount),
    timeAgo: timeAgo(t.createdAt),
    at: t.createdAt,
  }));

  // Pad with deterministic filler if fewer than 10 real items in 24h.
  const items = [...real];
  if (real.length < 10) {
    const hourSeed = Math.floor(Date.now() / (3600 * 1000));
    const rng = mulberry32(hourSeed);
    const FILLERS = [
      () => ({ type: "analysis_complete" }),
      () => ({ type: "deposit_approved", amount: [100, 200, 300, 500, 750, 1000][Math.floor(rng() * 6)] }),
      () => ({ type: "withdrawal_complete", amount: [120, 250, 400, 600, 900][Math.floor(rng() * 5)] }),
      () => ({ type: "invest_start" }),
      () => ({ type: "level_up" }),
      () => ({ type: "new_member" }),
    ];
    const need = 16 - real.length;
    for (let i = 0; i < need; i++) {
      const f = FILLERS[Math.floor(rng() * FILLERS.length)]();
      const minsAgo = Math.floor(rng() * 1400) + 1;
      items.push({
        memberNumber: 1000 + Math.floor(rng() * 8000),
        timeAgo: minsAgo < 60 ? `${minsAgo} min ago` : `${Math.floor(minsAgo / 60)} hr ago`,
        at: new Date(Date.now() - minsAgo * 60000),
        ...f,
      });
    }
  }

  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ items: items.slice(0, 18), enabled: true });
});

module.exports = router;
