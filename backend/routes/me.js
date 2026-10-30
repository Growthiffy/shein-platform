const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { auth } = require("../middleware/auth");
const { publicUser } = require("./auth");
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const Transaction = require("../models/Transaction");
const ChatMessage = require("../models/ChatMessage");
const { levelFor } = require("../utils/pricing");
const { accrueAndUpgrade } = require("../utils/accrual");
const { REFERRAL_BONUS } = require("../config/levels");
const { authenticator } = require("otplib");

const WALLET_HOLD_MS = 24 * 3600 * 1000;
// Flip any payout wallet past its 24h security hold to active. Returns true if changed.
function activateExpiredHolds(user) {
  let changed = false;
  for (const w of user.payoutWallets || []) {
    if (w.active === false && w.addedAt && Date.now() - new Date(w.addedAt).getTime() >= WALLET_HOLD_MS) {
      w.active = true; changed = true;
    }
  }
  return changed;
}

router.get("/", auth, async (req, res) => {
  await accrueAndUpgrade(req.user);
  if (activateExpiredHolds(req.user)) await req.user.save();
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
  // New addresses enter a 24h security hold (active:false) before use.
  req.user.payoutWallets.push({ chain, address, label, addedAt: new Date(), active: false });
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

// Anti-phishing code: a personal phrase shown in every platform email.
router.post("/anti-phish", auth, async (req, res) => {
  const code = String(req.body?.code || "").trim().slice(0, 40);
  if (!code) return res.status(400).json({ error: "code required" });
  req.user.antiPhishCode = code;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Toggle login-alert emails.
router.post("/login-alerts", auth, async (req, res) => {
  req.user.loginAlerts = !!req.body?.enabled;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Active sessions (recent logins formatted) + revoke-all.
router.get("/sessions", auth, async (req, res) => {
  const logins = await LoginHistory.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ sessions: logins.map(l => ({
    id: l._id, ip: l.ip, userAgent: l.userAgent, at: l.createdAt,
  })) });
});
router.post("/sessions/revoke-all", auth, async (req, res) => {
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  await req.user.save();
  // Re-issue a token for the current device so it stays signed in.
  const token = jwt.sign({ id: req.user._id.toString(), tv: req.user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.json({ ok: true, token });
});

// Two-factor (TOTP) setup → enable → disable.
router.post("/2fa/setup", auth, async (req, res) => {
  const secret = authenticator.generateSecret();
  req.user.twoFactorSecret = secret;        // stored but not enabled until confirmed
  await req.user.save();
  const label = encodeURIComponent(req.user.email || req.user.username || "member");
  const otpauth = authenticator.keyuri(label, "Shein", secret);
  res.json({ secret, otpauth });
});
router.post("/2fa/enable", auth, async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!req.user.twoFactorSecret) return res.status(400).json({ error: "run setup first" });
  const ok = authenticator.check(token, req.user.twoFactorSecret);
  if (!ok) return res.status(400).json({ error: "invalid code" });
  req.user.twoFactorEnabled = true;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});
router.post("/2fa/disable", auth, async (req, res) => {
  req.user.twoFactorEnabled = false;
  req.user.twoFactorSecret = undefined;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Standard verification: personal info. Upgrades immediately (feels like a
// process without a real review step).
router.post("/verify", auth, async (req, res) => {
  const { fullName, phone, country } = req.body || {};
  if (!fullName || !country) return res.status(400).json({ error: "full name and country are required" });
  const v = req.user.verification || {};
  v.fullName = String(fullName).trim();
  if (phone) v.phone = String(phone).trim();
  v.country = String(country).trim();
  v.submittedAt = new Date();
  // Never downgrade someone already at a higher level.
  if (!["premium", "pending_premium"].includes(v.level)) v.level = "standard";
  req.user.verification = v;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Premium (ID) verification: marks pending_premium for admin approval.
router.post("/verify/id", auth, async (req, res) => {
  const { idType, idNumber, idImageUrl } = req.body || {};
  if (!idType || !idNumber) return res.status(400).json({ error: "ID type and number are required" });
  const v = req.user.verification || {};
  v.idType = String(idType).trim();
  v.idNumber = String(idNumber).trim();
  if (idImageUrl) v.idImageUrl = String(idImageUrl).trim();
  v.submittedAt = new Date();
  if (v.level !== "premium") v.level = "pending_premium";
  req.user.verification = v;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Balance-over-time, reconstructed by replaying settled transactions. Returns up
// to 30 points for a lightweight dashboard chart (illustrative, not accounting).
router.get("/balance-history", auth, async (req, res) => {
  const txs = await Transaction.find({ user: req.user._id, status: { $ne: "rejected" } }).sort({ createdAt: 1 });
  const sign = { deposit: 1, withdrawal: -1, commission: 1, salary: 1, invest_payout: 1, reward: 1, invest_release: 1, invest_lock: -1, adjustment: 1 };
  let bal = 0;
  const points = [{ at: req.user.createdAt || (txs[0]?.createdAt) || new Date(), balance: 0 }];
  for (const t of txs) {
    const s = sign[t.type] ?? 0;
    bal = +(bal + s * t.amount).toFixed(2);
    points.push({ at: t.createdAt, balance: bal });
  }
  // Downsample to <=30 points, always keeping the last.
  let out = points;
  if (points.length > 30) {
    const step = Math.ceil(points.length / 30);
    out = points.filter((_, i) => i % step === 0);
    if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
  }
  res.json({ points: out, current: +(req.user.balance || 0).toFixed(2) });
});

// Onboarding checklist, derived from existing user state (no new flags beyond
// the one-shot `onboardingComplete` latch for the completion notification).
router.get("/onboarding", auth, async (req, res) => {
  const u = req.user;
  const [depositCount, chatCount] = await Promise.all([
    Transaction.countDocuments({ user: u._id, type: "deposit", status: "approved" }),
    ChatMessage.countDocuments({ user: u._id, authorType: "user" }),
  ]);
  const steps = [
    { key: "verify_email", done: !!u.emailVerified, label: "Verify your email" },
    { key: "set_username", done: !!u.username, label: "Choose a username" },
    { key: "first_analysis", done: (u.analyst?.cycleCount || 0) > 0, label: "Submit your first analysis" },
    { key: "first_deposit", done: depositCount > 0, label: "Make your first deposit" },
    { key: "join_community", done: chatCount > 0, label: "Send a message in Community" },
    { key: "choose_mentor", done: !!u.mentor, label: "Choose a mentor" },
  ];
  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  if (allDone && !u.onboardingComplete) {
    u.onboardingComplete = true;
    u.notifications.push({ text: "Welcome aboard! You've completed your onboarding. All platform features are now unlocked.", type: "success" });
    await u.save();
  }

  res.json({ steps, completedCount, totalCount: steps.length, allDone });
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
