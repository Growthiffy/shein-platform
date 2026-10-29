const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendVerificationCode, mailConfigured } = require("../utils/mailer");
const { SIGNUP_REWARD } = require("../config/levels");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

function makeCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function sign(u) { return jwt.sign({ id: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: "30d" }); }

// Deliver a verification code. Returns {sent, devCode}. Throws only if a mail
// provider is configured but delivery fails (so we never claim a false success).
async function deliverCode(email, code) {
  const sent = await sendVerificationCode(email, code);
  // In non-production with no provider, hand the code back so the flow is testable.
  const devCode = (!sent && !isProd) ? code : undefined;
  return { sent, devCode };
}

router.post("/signup", async (req, res) => {
  const { email: rawEmail, password } = req.body || {};
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || !password) return res.status(400).json({ error: "email + password required" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "invalid email" });
  if (String(password).length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });

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

  let delivery;
  try {
    delivery = await deliverCode(email, code);
  } catch (e) {
    console.error("mail send failed:", e.message);
    return res.status(502).json({ error: "could not send verification email; try again shortly" });
  }
  if (isProd && !delivery.sent) {
    // Provider missing in production is a misconfiguration, not a silent success.
    return res.status(500).json({ error: "email service not configured" });
  }
  res.json({ ok: true, needsVerification: true, devCode: delivery.devCode });
});

router.post("/verify", async (req, res) => {
  const { email: rawEmail, code } = req.body || {};
  const email = String(rawEmail || "").trim().toLowerCase();
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
  const { email: rawEmail, password } = req.body || {};
  const email = String(rawEmail || "").trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "bad credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "bad credentials" });
  if (!user.emailVerified) return res.status(403).json({ error: "verify email first", needsVerification: true });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/resend", async (req, res) => {
  const { email: rawEmail } = req.body || {};
  const email = String(rawEmail || "").trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "no user" });
  if (user.emailVerified) return res.status(400).json({ error: "already verified" });
  user.verifyCode = makeCode();
  user.verifyExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  let delivery;
  try {
    delivery = await deliverCode(email, user.verifyCode);
  } catch (e) {
    console.error("mail resend failed:", e.message);
    return res.status(502).json({ error: "could not send verification email; try again shortly" });
  }
  if (isProd && !delivery.sent) return res.status(500).json({ error: "email service not configured" });
  res.json({ ok: true, devCode: delivery.devCode });
});

function publicUser(u) {
  return {
    id: u._id, email: u.email, username: u.username, balance: u.balance,
    level: u.level, dailySalary: u.dailySalary, totalEarned: u.totalEarned,
    emailVerified: u.emailVerified, mentor: u.mentor,
    isAdmin: u.isAdmin, role: u.role || (u.isAdmin ? "admin" : "customer"),
    investment: u.investment, payoutWallets: u.payoutWallets,
    analyst: { cycleCount: u.analyst?.cycleCount || 0 },
    rewardCredit: u.rewardCredit || 0,
    communityAccess: {
      daily:       u.communityAccess?.daily !== false,
      invest:      u.communityAccess?.invest !== false,
      mentorRooms: u.communityAccess?.mentorRooms !== false,
    },
  };
}

module.exports = router;
module.exports.publicUser = publicUser;
