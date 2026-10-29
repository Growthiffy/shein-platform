const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendVerificationCode } = require("../utils/mailer");
const { SIGNUP_REWARD } = require("../config/levels");

function makeCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function sign(u) { return jwt.sign({ id: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: "30d" }); }

router.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email + password required" });
  const existing = await User.findOne({ email });
  if (existing && existing.emailVerified) return res.status(409).json({ error: "email in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const code = makeCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  const user = existing || new User({ email });
  user.passwordHash = passwordHash;
  user.verifyCode = code;
  user.verifyExpires = expires;
  user.rewardCredit = SIGNUP_REWARD;
  await user.save();

  await sendVerificationCode(email, code);
  res.json({ ok: true, needsVerification: true });
});

router.post("/verify", async (req, res) => {
  const { email, code } = req.body || {};
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "no user" });
  if (user.verifyExpires && user.verifyExpires < new Date()) return res.status(400).json({ error: "code expired" });
  if (user.verifyCode !== code) return res.status(400).json({ error: "bad code" });
  user.emailVerified = true;
  user.verifyCode = undefined;
  user.verifyExpires = undefined;
  // Signup reward lands in balance only on verify.
  if (!user.balance && user.rewardCredit) {
    user.balance = user.rewardCredit;
    user.rewardCredit = 0;
  }
  await user.save();
  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "bad credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "bad credentials" });
  if (!user.emailVerified) return res.status(403).json({ error: "verify email first", needsVerification: true });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/resend", async (req, res) => {
  const { email } = req.body || {};
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "no user" });
  user.verifyCode = makeCode();
  user.verifyExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();
  await sendVerificationCode(email, user.verifyCode);
  res.json({ ok: true });
});

function publicUser(u) {
  return {
    id: u._id, email: u.email, username: u.username, balance: u.balance,
    level: u.level, dailySalary: u.dailySalary, totalEarned: u.totalEarned,
    emailVerified: u.emailVerified, mentor: u.mentor, isAdmin: u.isAdmin,
    investment: u.investment, payoutWallets: u.payoutWallets,
    analyst: { cycleCount: u.analyst?.cycleCount || 0 },
    rewardCredit: u.rewardCredit || 0,
  };
}

module.exports = router;
module.exports.publicUser = publicUser;
