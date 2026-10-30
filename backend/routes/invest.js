const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { INVEST_TIERS } = require("../config/levels");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getSetting } = require("../utils/settings");

router.get("/tiers", async (req, res) => {
  const lockWeeks = Number(await getSetting("investLockWeeks"));
  res.json({ tiers: INVEST_TIERS, lockWeeks });
});

router.post("/start", auth, async (req, res) => {
  // Lock period is admin-controlled; any lockWeeks in the request body is ignored.
  const { amount, tierLevel } = req.body || {};
  const amt = Number(amount);
  const lockWeeks = Number(await getSetting("investLockWeeks"));
  const tier = INVEST_TIERS.find(t => t.level === Number(tierLevel));
  if (!tier) return res.status(400).json({ error: "bad tier" });
  if (req.user.frozen?.active) return res.status(403).json({ error: "Your account is in deficit. Clear it to invest.", frozen: true });
  if (!Number.isFinite(amt) || amt < tier.min) return res.status(400).json({ error: `min ${tier.min}` });
  if (req.user.investment?.amount > 0) return res.status(400).json({ error: "You already have an active investment. Release it before starting a new one." });

  const now = new Date();
  const lockUntil = new Date(now.getTime() + lockWeeks * 7 * 24 * 3600 * 1000);
  // Atomic: deduct the principal only if the balance still covers it AND no
  // investment is active — so a double-submit can't overwrite an active
  // investment (losing its principal) or overdraw the balance.
  const updated = await User.findOneAndUpdate(
    { _id: req.user._id, balance: { $gte: amt }, $or: [{ "investment.amount": { $in: [0, null] } }, { investment: null }] },
    { $inc: { balance: -amt }, $set: { investment: { tier: tier.level, amount: amt, startedAt: now, lockUntil, lastPayoutAt: now } } },
    { new: true }
  );
  if (!updated) return res.status(400).json({ error: "insufficient balance, or an investment is already active" });

  await Transaction.create({ user: req.user._id, type: "invest_lock", amount: amt, note: `Tier ${tier.name}` });
  res.json({ investment: updated.investment, balance: +Number(updated.balance).toFixed(2) });
});

const WEEK_MS = 7 * 24 * 3600 * 1000;

// Live summary of the member's active investment.
router.get("/summary", auth, async (req, res) => {
  const inv = req.user.investment;
  if (!inv?.amount) return res.json({ active: false });
  const tier = INVEST_TIERS.find(t => t.level === inv.tier) || {};
  const now = Date.now();
  const started = inv.startedAt ? new Date(inv.startedAt).getTime() : now;
  const lastPayout = inv.lastPayoutAt ? new Date(inv.lastPayoutAt).getTime() : started;
  const weeklyPct = tier.weeklyPct || 0;
  const weeklyEarn = +(inv.amount * weeklyPct / 100).toFixed(2);
  const weeksElapsed = Math.floor((now - started) / WEEK_MS);
  const paidAgg = await Transaction.aggregate([
    { $match: { user: req.user._id, type: "invest_payout" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  res.json({
    active: true,
    tier: inv.tier, tierName: tier.name, amount: inv.amount, weeklyPct,
    weeklyEarn, weeksElapsed,
    startedAt: inv.startedAt, lockUntil: inv.lockUntil,
    nextPayoutAt: new Date(lastPayout + WEEK_MS),
    unlocked: !inv.lockUntil || new Date(inv.lockUntil).getTime() <= now,
    totalPaid: +(paidAgg[0]?.total || 0).toFixed(2),
  });
});

router.post("/release", auth, async (req, res) => {
  const inv = req.user.investment;
  if (!inv?.amount) return res.status(400).json({ error: "no active investment" });
  if (inv.lockUntil && inv.lockUntil > new Date()) return res.status(400).json({ error: "still locked" });
  const amt = inv.amount;
  const now = new Date();
  // Atomic: return the principal and clear the investment in one guarded op, so a
  // double-click can't credit the principal twice.
  const updated = await User.findOneAndUpdate(
    { _id: req.user._id, "investment.amount": { $gt: 0 }, $or: [{ "investment.lockUntil": null }, { "investment.lockUntil": { $lte: now } }] },
    [
      { $set: { balance: { $round: [{ $add: ["$balance", "$investment.amount"] }, 2] } } },
      { $set: { investment: { tier: 0, amount: 0, startedAt: null, lockUntil: null, lastPayoutAt: null } } },
    ],
    { new: true }
  );
  if (!updated) return res.status(400).json({ error: "no active investment" });
  await Transaction.create({ user: req.user._id, type: "invest_release", amount: amt, note: "principal returned" });
  res.json({ balance: +Number(updated.balance).toFixed(2) });
});

module.exports = router;
