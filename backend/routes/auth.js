const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Counter = require("../models/Counter");
const LoginHistory = require("../models/LoginHistory");
const Transaction = require("../models/Transaction");
const { sendVerificationCode, mailConfigured } = require("../utils/mailer");
const { SIGNUP_REWARD, REFERRAL_BONUS } = require("../config/levels");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isProd = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

function makeCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function sign(u) { return jwt.sign({ id: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: "30d" }); }

// Unique short invite code.
async function makeReferralCode() {
  for (let i = 0; i < 6; i++) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    if (!(await User.findOne({ referralCode: code }))) return code;
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function recordLogin(user, req) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
  LoginHistory.create({ user: user._id, ip, userAgent: req.headers["user-agent"] }).catch(() => {});
}

// Deliver a verification code. Returns {sent, devCode}. Throws only if a mail
// provider is configured but delivery fails (so we never claim a false success).
async function deliverCode(email, code) {
  const sent = await sendVerificationCode(email, code);
  // In non-production with no provider, hand the code back so the flow is testable.
  const devCode = (!sent && !isProd) ? code : undefined;
  return { sent, devCode };
}

router.post("/signup", async (req, res) => {
  const { email: rawEmail, password, ref } = req.body || {};
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
  // Attach referrer once (only before the invitee has verified).
  if (ref && !user.emailVerified && !user.referredBy) {
    const referrer = await User.findOne({ referralCode: String(ref).trim().toUpperCase() });
    if (referrer && String(referrer._id) !== String(user._id)) user.referredBy = referrer._id;
  }
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
  // Assign a member number + referral code on first verify.
  if (!user.accountNumber) user.accountNumber = await Counter.next("accountNumber");
  if (!user.referralCode) user.referralCode = await makeReferralCode();
  await user.save();

  // Credit the referrer once, when their invitee verifies.
  if (user.referredBy) {
    const referrer = await User.findById(user.referredBy);
    if (referrer) {
      referrer.balance = +(referrer.balance + REFERRAL_BONUS).toFixed(2);
      referrer.totalEarned = +(referrer.totalEarned + REFERRAL_BONUS).toFixed(2);
      referrer.notifications.push({ text: `You earned $${REFERRAL_BONUS} — an invite joined and verified.`, type: "success" });
      await referrer.save();
      await Transaction.create({ user: referrer._id, type: "reward", amount: REFERRAL_BONUS, note: "referral bonus" });
    }
  }

  recordLogin(user, req);
  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email: rawEmail, password } = req.body || {};
  const identifier = String(rawEmail || "").trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) return res.status(401).json({ error: "bad credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "bad credentials" });
  if (!user.emailVerified) return res.status(403).json({ error: "verify email first", needsVerification: true });
  recordLogin(user, req);
  res.json({ token: sign(user), user: publicUser(user) });
});

router.post("/logout", (req, res) => res.json({ ok: true })); // token is cleared client-side

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
    accountNumber: u.accountNumber, phone: u.phone, avatar: u.avatar,
    creditScore: u.creditScore ?? 100, referralCode: u.referralCode,
    createdAt: u.createdAt,
    notifications: (u.notifications || []).slice(-30).reverse(),
    communityAccess: {
      daily:       u.communityAccess?.daily !== false,
      invest:      u.communityAccess?.invest !== false,
      mentorRooms: u.communityAccess?.mentorRooms !== false,
    },
  };
}

module.exports = router;
module.exports.publicUser = publicUser;
