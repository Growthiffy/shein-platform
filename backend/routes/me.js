const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { auth } = require("../middleware/auth");
const { publicUser } = require("./auth");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const { levelFor } = require("../utils/pricing");
const { accrueAndUpgrade } = require("../utils/accrual");
const { REFERRAL_BONUS } = require("../config/levels");

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

// Update editable profile fields.
router.post("/profile", auth, async (req, res) => {
  const { phone, avatar } = req.body || {};
  if (phone !== undefined) req.user.phone = String(phone).trim();
  if (avatar !== undefined) req.user.avatar = String(avatar).trim();
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Change login password.
router.post("/password", auth, async (req, res) => {
  const { current, next } = req.body || {};
  if (!next || String(next).length < 8) return res.status(400).json({ error: "new password must be at least 8 characters" });
  const ok = await bcrypt.compare(String(current || ""), req.user.passwordHash);
  if (!ok) return res.status(400).json({ error: "current password is incorrect" });
  req.user.passwordHash = await bcrypt.hash(String(next), 10);
  await req.user.save();
  res.json({ ok: true });
});

// Referral summary.
router.get("/referral", auth, async (req, res) => {
  const invited = await User.find({ referredBy: req.user._id })
    .select("email username emailVerified createdAt").sort({ createdAt: -1 }).limit(100);
  res.json({
    code: req.user.referralCode || null,
    bonus: REFERRAL_BONUS,
    count: invited.length,
    verifiedCount: invited.filter(u => u.emailVerified).length,
    invited: invited.map(u => ({
      name: u.username || u.email.split("@")[0],
      verified: u.emailVerified,
      createdAt: u.createdAt,
    })),
  });
});

// Recent logins for the Security page.
router.get("/security", auth, async (req, res) => {
  const logins = await LoginHistory.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ logins });
});

// Mark all notifications read.
router.post("/notifications/read", auth, async (req, res) => {
  req.user.notifications.forEach(n => { n.read = true; });
  await req.user.save();
  res.json({ ok: true });
});

// Clear all notifications.
router.post("/notifications/clear", auth, async (req, res) => {
  req.user.notifications = [];
  await req.user.save();
  res.json({ ok: true });
});

module.exports = router;
