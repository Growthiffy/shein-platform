const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getSettings } = require("../utils/settings");
const { identity, fakeAddress, selfIdentity } = require("../utils/fakeIdentities");

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

// GET /api/activity/feed — the live activity feed. A member sees only THEIR OWN
// real activity (never other real members), padded with fabricated identities from
// the weighted pool. Real own entries carry the member's real name, avatar and
// (for money movements) real wallet address.
router.get("/feed", auth, async (req, res) => {
  const s = await getSettings(["activityFeedEnabled"]);
  if (s.activityFeedEnabled === false) return res.json({ items: [], enabled: false });

  const self = selfIdentity(req.user);
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  // Only "big" money events — deposits, withdrawals, investments. No tiny
  // analysis-cycle / commission noise.
  const txs = await Transaction.find({
    user: req.user._id,
    createdAt: { $gte: since },
    type: { $in: ["deposit", "withdrawal", "invest_lock"] },
    status: { $in: ["approved", "complete"] },
  }).sort({ createdAt: -1 }).limit(8);

  const real = txs.map(t => ({
    type: TYPE_MAP[t.type].type,
    name: self.name, avatar: self.avatar, flag: self.flag,
    amount: Math.round(t.amount),
    address: (t.type === "withdrawal" || t.type === "deposit") ? (t.address || null) : undefined,
    timeAgo: timeAgo(t.createdAt),
    at: t.createdAt, real: true,
  }));

  // Pad with fabricated pool identities. Reseeded on a fast bucket (~9s) so the
  // feed keeps moving, with IRREGULAR arrival gaps — the newest item is sometimes
  // seconds old, sometimes a minute — so it never looks like a fixed interval.
  const items = [...real];
  const now = Date.now();
  const bucket = Math.floor(now / 9000);
  const rng = mulberry32((bucket ^ 0x1f2e3d4c) >>> 0);
  // Only "big" events — big deposits, withdrawals, investments, level-ups.
  const FILLERS = [
    () => ({ type: "deposit_approved", amount: [500, 750, 1000, 1500, 2500, 5000][Math.floor(rng() * 6)] }),
    () => ({ type: "withdrawal_complete", amount: [400, 600, 900, 1400, 2200, 3500][Math.floor(rng() * 6)] }),
    () => ({ type: "invest_start" }),
    () => ({ type: "level_up" }),
  ];
  let n = Math.floor(rng() * 1e9);
  const need = Math.max(16 - real.length, 12);
  // First gap is small and random (2–45s) → head feels fresh; later gaps grow
  // irregularly so the stream looks organic, not metronomic.
  let secAgo = 2 + Math.floor(rng() * 43);
  for (let i = 0; i < need; i++) {
    const f = FILLERS[Math.floor(rng() * FILLERS.length)]();
    const id = identity(n += 7919);
    const wd = f.type === "withdrawal_complete", dp = f.type === "deposit_approved";
    const at = new Date(now - secAgo * 1000);
    items.push({
      name: id.name, avatar: id.avatar, flag: id.flag,
      address: (wd || dp) ? fakeAddress(id.id + ":" + secAgo) : undefined,
      timeAgo: timeAgo(at), at, real: false,
      ...f,
    });
    // Next event is anywhere from ~8s to ~5min older — random cadence.
    secAgo += 8 + Math.floor(rng() * rng() * 300);
  }

  items.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ items: items.slice(0, 18), enabled: true });
});

module.exports = router;
