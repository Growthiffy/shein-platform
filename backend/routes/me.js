const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { publicUser } = require("./auth");
const User = require("../models/User");
const { levelFor } = require("../utils/pricing");
const { accrueAndUpgrade } = require("../utils/accrual");

router.get("/", auth, async (req, res) => {
  await accrueAndUpgrade(req.user);
  res.json({ user: publicUser(req.user) });
});

router.post("/username", auth, async (req, res) => {
  const { username } = req.body || {};
  if (!username || username.length < 3) return res.status(400).json({ error: "min 3 chars" });
  const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
  if (taken) return res.status(409).json({ error: "username taken" });
  req.user.username = username;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.post("/payout-wallet", auth, async (req, res) => {
  const { chain, address, label } = req.body || {};
  if (!chain || !address) return res.status(400).json({ error: "chain + address required" });
  req.user.payoutWallets.push({ chain, address, label });
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.delete("/payout-wallet/:idx", auth, async (req, res) => {
  const i = Number(req.params.idx);
  req.user.payoutWallets.splice(i, 1);
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.get("/level-info", auth, async (req, res) => {
  const lvl = levelFor(req.user.balance);
  res.json({ level: lvl });
});

module.exports = router;
