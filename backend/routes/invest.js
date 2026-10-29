const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { INVEST_TIERS } = require("../config/levels");
const Transaction = require("../models/Transaction");

router.get("/tiers", (req, res) => res.json({ tiers: INVEST_TIERS }));

router.post("/start", auth, async (req, res) => {
  const { amount, tierLevel, lockWeeks = 4 } = req.body || {};
  const tier = INVEST_TIERS.find(t => t.level === Number(tierLevel));
  if (!tier) return res.status(400).json({ error: "bad tier" });
  if (Number(amount) < tier.min) return res.status(400).json({ error: `min ${tier.min}` });
  if (Number(amount) > req.user.balance) return res.status(400).json({ error: "insufficient balance" });

  const now = new Date();
  const lockUntil = new Date(now.getTime() + lockWeeks * 7 * 24 * 3600 * 1000);
  req.user.balance = +(req.user.balance - amount).toFixed(2);
  req.user.investment = {
    tier: tier.level, amount: Number(amount),
    startedAt: now, lockUntil, lastPayoutAt: now,
  };
  await req.user.save();

  await Transaction.create({ user: req.user._id, type: "invest_lock", amount: Number(amount), note: `Tier ${tier.name}` });
  res.json({ investment: req.user.investment, balance: req.user.balance });
});

router.post("/release", auth, async (req, res) => {
  const inv = req.user.investment;
  if (!inv?.amount) return res.status(400).json({ error: "no active investment" });
  if (inv.lockUntil && inv.lockUntil > new Date()) return res.status(400).json({ error: "still locked" });
  const amt = inv.amount;
  req.user.balance = +(req.user.balance + amt).toFixed(2);
  req.user.investment = { tier: 0, amount: 0 };
  await req.user.save();
  await Transaction.create({ user: req.user._id, type: "invest_release", amount: amt });
  res.json({ balance: req.user.balance });
});

module.exports = router;
