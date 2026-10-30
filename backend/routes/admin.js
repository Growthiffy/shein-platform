const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { auth, admin } = require("../middleware/auth");
const User = require("../models/User");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const Transaction = require("../models/Transaction");
const AnalystSubmission = require("../models/AnalystSubmission");
const DepositWallet = require("../models/DepositWallet");
const Mentor = require("../models/Mentor");
const ChatMessage = require("../models/ChatMessage");
const Setting = require("../models/Setting");
const Persona = require("../models/Persona");
const LoginHistory = require("../models/LoginHistory");
const SupportMessage = require("../models/SupportMessage");
const Announcement = require("../models/Announcement");
const Combo = require("../models/Combo");
const AccountChange = require("../models/AccountChange");
const Page = require("../models/Page");
const ContactMessage = require("../models/ContactMessage");
const { logChange } = require("../utils/ledger");
const { triggerCombo, settleCombo } = require("../utils/combo");
const AdminNotification = require("../models/AdminNotification");
const { TYPES: NOTIF_TYPES } = require("../utils/adminNotify");
const { DEFAULTS, getSettings } = require("../utils/settings");
const { sendDepositApproved, sendWithdrawalStatus } = require("../utils/mailer");
const { PERMISSIONS, KEYS, isFullAccess, hasAccess } = require("../config/permissions");

router.use(auth, admin);

// RBAC gate: map the request path to a permission area and enforce it. Operators
// with full access (owner) pass everything; the overview/stats + permissions
// list stay open to any admin.
const AREA = [
  [/^\/stats/, null],
  [/^\/permissions/, null],
  [/^\/notifications/, null],
  [/^\/notif-config/, null],
  [/^\/users/, "members"],
  [/^\/broadcast/, "members"],
  [/^\/combos/, "members"],
  [/^\/account-changes/, "members"],
  [/^\/pages/, "settings"],
  [/^\/contact/, "support"],
  [/^\/admins/, "admins"],
  [/^\/products/, "products"],
  [/^\/tx/, "transactions"],
  [/^\/deposit-wallets/, "wallets"],
  [/^\/mentors/, "mentors"],
  [/^\/chat/, "community"],
  [/^\/announcements/, "announcements"],
  [/^\/personas/, "personas"],
  [/^\/support/, "support"],
  [/^\/referrals/, "referrals"],
  [/^\/login-history/, "login_history"],
  [/^\/settings/, "settings"],
];
router.use((req, res, next) => {
  const entry = AREA.find(([re]) => re.test(req.path));
  const perm = entry ? entry[1] : null;
  // Managing admins always requires full (owner) access.
  if (perm === "admins" && !isFullAccess(req.user)) return res.status(403).json({ error: "owner access required" });
  if (hasAccess(req.user, perm)) return next();
  res.status(403).json({ error: `missing permission: ${perm}` });
});

// Permission catalogue (for the Admins UI).
router.get("/permissions", (req, res) => res.json({ permissions: PERMISSIONS, me: { fullAccess: isFullAccess(req.user), permissions: req.user.permissions || [] } }));

// Dashboard stats.
router.get("/stats", async (req, res) => {
  const [users, verified, pendingDeposits, pendingWithdrawals, personas, openSupport] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", emailVerified: true }),
    Transaction.countDocuments({ type: "deposit", status: "pending" }),
    Transaction.countDocuments({ type: "withdrawal", status: "pending" }),
    Persona.countDocuments({ active: true }),
    SupportMessage.countDocuments({ from: "user", readByStaff: false }),
  ]);
  const agg = await Transaction.aggregate([
    { $match: { type: { $in: ["deposit"] }, status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const balAgg = await User.aggregate([{ $match: { role: "customer" } }, { $group: { _id: null, total: { $sum: "$balance" } } }]);
  const [recentUsers, recentTx] = await Promise.all([
    User.find({ role: "customer" }).sort({ createdAt: -1 }).limit(6).select("email username accountNumber createdAt emailVerified"),
    Transaction.find().sort({ createdAt: -1 }).limit(8).populate("user", "email username"),
  ]);
  res.json({
    stats: {
      users, verified,
      pendingDeposits, pendingWithdrawals,
      activePersonas: personas, openSupport,
      depositVolume: agg[0]?.total || 0,
      totalBalances: +(balAgg[0]?.total || 0).toFixed(2),
    },
    recentUsers,
    recentTx: recentTx.map(t => ({ id: t._id, type: t.type, amount: t.amount, status: t.status, at: t.createdAt, user: t.user?.username || t.user?.email || "—" })),
  });
});

// Login history (all members).
router.get("/login-history", async (req, res) => {
  const items = await LoginHistory.find().sort({ createdAt: -1 }).limit(300).populate("user", "email username accountNumber");
  res.json({ items });
});

// Top referrers.
router.get("/referrals", async (req, res) => {
  const rows = await User.aggregate([
    { $match: { referredBy: { $ne: null } } },
    { $group: { _id: "$referredBy", count: { $sum: 1 }, verified: { $sum: { $cond: ["$emailVerified", 1, 0] } } } },
    { $sort: { count: -1 } }, { $limit: 100 },
  ]);
  const ids = rows.map(r => r._id);
  const users = await User.find({ _id: { $in: ids } }).select("email username referralCode accountNumber");
  const byId = Object.fromEntries(users.map(u => [String(u._id), u]));
  res.json({ items: rows.map(r => ({
    user: byId[String(r._id)] ? { email: byId[String(r._id)].email, username: byId[String(r._id)].username, code: byId[String(r._id)].referralCode } : null,
    invited: r.count, verified: r.verified,
  })) });
});

// Support: list threads. `status` = active | ended | all (default all). A thread
// is ended if its most recent message is marked closed.
router.get("/support", async (req, res) => {
  const rows = await SupportMessage.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: {
      _id: "$user",
      last: { $first: "$text" }, lastAt: { $first: "$createdAt" }, ended: { $first: "$closed" },
      unread: { $sum: { $cond: [{ $and: [{ $eq: ["$from", "user"] }, { $eq: ["$readByStaff", false] }] }, 1, 0] } },
    } },
    { $sort: { lastAt: -1 } }, { $limit: 300 },
  ]);
  const want = req.query.status;
  const filtered = want === "active" ? rows.filter(r => !r.ended)
    : want === "ended" ? rows.filter(r => r.ended) : rows;
  const users = await User.find({ _id: { $in: filtered.map(r => r._id) } }).select("email username accountNumber");
  const byId = Object.fromEntries(users.map(u => [String(u._id), u]));
  res.json({ items: filtered.map(r => ({
    userId: r._id, email: byId[String(r._id)]?.email, username: byId[String(r._id)]?.username,
    accountNumber: byId[String(r._id)]?.accountNumber,
    last: r.last, lastAt: r.lastAt, unread: r.unread, ended: !!r.ended,
  })) });
});
router.get("/support/:userId", async (req, res) => {
  const items = await SupportMessage.find({ user: req.params.userId }).sort({ createdAt: 1 }).limit(300);
  await SupportMessage.updateMany({ user: req.params.userId, from: "user", readByStaff: false }, { readByStaff: true });
  const last = items[items.length - 1];
  res.json({ items, ended: !!(last && last.closed) });
});
router.post("/support/:userId", async (req, res) => {
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  if (text.length > 4000) return res.status(400).json({ error: "message too long" });
  const msg = await SupportMessage.create({ user: req.params.userId, from: "staff", text, closed: false, readByUser: false });
  res.json({ msg });
});
// End (archive) a thread: mark everything closed + drop a system note + notify member.
router.post("/support/:userId/end", async (req, res) => {
  await SupportMessage.updateMany({ user: req.params.userId }, { closed: true });
  await SupportMessage.create({ user: req.params.userId, from: "system", text: "Support chat ended by staff.", closed: true });
  const u = await User.findById(req.params.userId);
  if (u) { u.notifications.push({ text: "Your support chat was closed. Reply any time to reopen it.", type: "info" }); await u.save(); }
  res.json({ ok: true });
});
// Reopen a thread (system note, closed:false).
router.post("/support/:userId/reopen", async (req, res) => {
  await SupportMessage.create({ user: req.params.userId, from: "system", text: "Support chat reopened by staff.", closed: false });
  res.json({ ok: true });
});
// Permanently delete a thread.
router.delete("/support/:userId", async (req, res) => {
  await SupportMessage.deleteMany({ user: req.params.userId });
  res.json({ ok: true });
});

// Broadcast an in-app notification to every user.
router.post("/broadcast", async (req, res) => {
  const { text, type } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "text required" });
  const r = await User.updateMany({ role: "customer" }, { $push: { notifications: { text: text.trim(), type: type || "info", read: false, createdAt: new Date() } } });
  res.json({ ok: true, sent: r.modifiedCount ?? r.nModified ?? 0 });
});

// Admin operators (backend users). Separate from members.
router.get("/admins", async (req, res) => {
  const items = await User.find({ role: "admin" }).select("email username createdAt permissions").sort({ createdAt: 1 });
  // Which operators are also mentors (own an active Mentor profile).
  const mentors = await Mentor.find({ owner: { $ne: null } }).select("owner name title active");
  const byOwner = new Map(mentors.map(m => [String(m.owner), m]));
  res.json({ items: items.map(o => {
    const m = byOwner.get(String(o._id));
    return { _id: o._id, email: o.email, username: o.username, createdAt: o.createdAt, permissions: o.permissions || [], fullAccess: isFullAccess(o),
      mentor: m ? { _id: m._id, name: m.name, title: m.title, active: m.active } : null };
  }) });
});
router.post("/admins", async (req, res) => {
  const email = (req.body?.email || "").trim().toLowerCase() || undefined;
  const { username, password, permissions } = req.body || {};
  if (!username) return res.status(400).json({ error: "username required" });
  if (!password) return res.status(400).json({ error: "password required" });
  if (String(password).length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });
  if (email && await User.findOne({ email })) return res.status(409).json({ error: "email already in use" });
  if (await User.findOne({ username: username.trim() })) return res.status(409).json({ error: "username already in use" });
  const perms = Array.isArray(permissions) ? permissions.filter(p => KEYS.includes(p)) : [];
  const op = await User.create({
    email: email || undefined, username: username.trim(),
    passwordHash: await bcrypt.hash(String(password), 10),
    role: "admin", isAdmin: true, emailVerified: true, rewardCredit: 0,
    permissions: perms, // empty = full access
  });
  res.json({ item: { _id: op._id, email: op.email, username: op.username, createdAt: op.createdAt, permissions: op.permissions, fullAccess: isFullAccess(op) } });
});
// Update an operator's permissions. fullAccess:true clears the list (owner); else
// store the validated subset.
router.patch("/admins/:id", async (req, res) => {
  const op = await User.findById(req.params.id);
  if (!op || op.role !== "admin") return res.status(404).json({ error: "no admin" });
  const { fullAccess, permissions } = req.body || {};
  if (fullAccess) op.permissions = [];
  else op.permissions = (Array.isArray(permissions) ? permissions : []).filter(p => KEYS.includes(p));
  await op.save();
  res.json({ item: { _id: op._id, email: op.email, username: op.username, permissions: op.permissions, fullAccess: isFullAccess(op) } });
});
router.delete("/admins/:id", async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ error: "cannot remove yourself" });
  const count = await User.countDocuments({ role: "admin" });
  if (count <= 1) return res.status(400).json({ error: "cannot remove the last admin" });
  const op = await User.findById(req.params.id);
  if (!op || op.role !== "admin") return res.status(404).json({ error: "no admin" });
  // Detach any mentor profile this operator owned (keep the profile for history,
  // just disable its live human control).
  await Mentor.updateMany({ owner: op._id }, { $set: { owner: null, active: false } });
  await op.deleteOne();
  res.json({ ok: true });
});

// Promote/demote an operator to/from mentor. Enabling links (or creates) a
// Mentor profile owned by this admin so they reply to mentees as a real human;
// disabling deactivates it but preserves member assignments.
router.patch("/admins/:id/mentor", async (req, res) => {
  const op = await User.findById(req.params.id);
  if (!op || op.role !== "admin") return res.status(404).json({ error: "no admin" });
  const { enabled, name, title, bio, avatar } = req.body || {};
  let mentor = await Mentor.findOne({ owner: op._id });
  if (enabled) {
    const fields = { active: true, owner: op._id };
    if (name !== undefined) fields.name = name;
    if (title !== undefined) fields.title = title;
    if (bio !== undefined) fields.bio = bio;
    if (avatar !== undefined) fields.avatar = avatar;
    if (mentor) { Object.assign(mentor, fields); await mentor.save(); }
    else {
      mentor = await Mentor.create({ name: name || op.username || "Mentor", title, bio, avatar, active: true, owner: op._id });
    }
  } else if (mentor) {
    mentor.active = false;
    await mentor.save();
  }
  res.json({ mentor: mentor ? { _id: mentor._id, name: mentor.name, title: mentor.title, active: mentor.active } : null });
});

// Push an in-app notification to a user.
router.post("/users/:id/notify", async (req, res) => {
  const { text, type } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "text required" });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.notifications.push({ text: text.trim(), type: type || "info" });
  await u.save();
  res.json({ ok: true });
});

// Members (customers only — admin operators are managed separately under /admins).
// Supports ?q= search (username/email/accountNumber) and ?status=suspended|active.
router.get("/users", async (req, res) => {
  const filter = { role: "customer" };
  if (req.query.status === "suspended") filter.suspended = true;
  if (req.query.status === "active") filter.suspended = { $ne: true };
  const q = String(req.query.q || "").trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ username: rx }, { email: rx }];
    if (/^\d+$/.test(q)) filter.$or.push({ accountNumber: Number(q) });
  }
  res.json({ items: await User.find(filter).select("-passwordHash").sort({ createdAt: -1 }).limit(500) });
});

// Create a member directly from the admin portal (no email verification needed).
async function uniqueReferralCode() {
  for (let i = 0; i < 6; i++) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    if (!(await User.findOne({ referralCode: code }))) return code;
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
router.post("/users", async (req, res) => {
  const { username, password } = req.body || {};
  const email = (req.body?.email || "").trim().toLowerCase() || undefined;
  if (!username || !username.trim()) return res.status(400).json({ error: "username required" });
  if (!password || String(password).length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });
  if (await User.findOne({ username: username.trim() })) return res.status(409).json({ error: "username already in use" });
  if (email && await User.findOne({ email })) return res.status(409).json({ error: "email already in use" });

  const level = ["beginner", "silver", "gold"].includes(req.body?.level) ? req.body.level : "beginner";
  const vLevel = ["none", "basic", "standard", "pending_premium", "premium"].includes(req.body?.verificationLevel) ? req.body.verificationLevel : "basic";
  const balance = Number.isFinite(Number(req.body?.balance)) ? Number(req.body.balance) : 0;

  const u = await User.create({
    username: username.trim(), email,
    passwordHash: await bcrypt.hash(String(password), 10),
    role: "customer", emailVerified: true, rewardCredit: 0,
    balance, level, phone: req.body?.phone,
    accountNumber: await Counter.next("accountNumber"),
    referralCode: await uniqueReferralCode(),
    verification: { level: vLevel },
  });
  const user = u.toObject(); delete user.passwordHash;
  res.json({ user });
});

// Full detail for one member: profile + related records (for the admin member view).
router.get("/users/:id", async (req, res) => {
  const u = await User.findById(req.params.id).select("-passwordHash");
  if (!u) return res.status(404).json({ error: "no user" });
  const [txs, submissions, logins, referrals, supportCount] = await Promise.all([
    Transaction.find({ user: u._id }).sort({ createdAt: -1 }).limit(50),
    AnalystSubmission.countDocuments({ user: u._id }),
    LoginHistory.find({ user: u._id }).sort({ createdAt: -1 }).limit(20),
    User.countDocuments({ referredBy: u._id }),
    SupportMessage.countDocuments({ user: u._id }),
  ]);
  res.json({ user: u, transactions: txs, submissions, logins, referrals, supportCount });
});

// A member's login history (IP / device / time).
router.get("/users/:id/logins", async (req, res) => {
  const items = await LoginHistory.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(100);
  res.json({ items });
});

// Fields settable through the member edit form. role/isAdmin/password are handled
// by dedicated endpoints; email/username are checked for uniqueness below.
const USER_EDITABLE = ["balance", "dailySalary", "level", "username", "email", "emailVerified", "mentor", "rewardCredit", "totalEarned", "communityAccess", "creditScore", "phone", "avatar", "loginAlerts", "onboardingComplete", "referralCode", "accountNumber"];
router.patch("/users/:id", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role === "admin") return res.status(404).json({ error: "no member" });
  const b = req.body || {};
  if ("accountNumber" in b) {
    if (!(["string", "number"].includes(typeof b.accountNumber)) || !/^\d+$/.test(String(b.accountNumber).trim()) || !Number.isSafeInteger(Number(b.accountNumber)) || Number(b.accountNumber) < 1 || Number(b.accountNumber) >= Number.MAX_SAFE_INTEGER - 10000) {
      return res.status(400).json({ error: "Member ID must be a positive whole number." });
    }
    b.accountNumber = Number(b.accountNumber);
    if (await User.exists({ accountNumber: b.accountNumber, _id: { $ne: u._id } })) return res.status(409).json({ error: "Member ID already in use." });
    // Reserve higher IDs so future automatic assignments do not reuse them.
    await Counter.updateOne({ key: "accountNumber" }, { $max: { seq: Math.max(0, b.accountNumber - 10000) } }, { upsert: true });
  }
  // Uniqueness checks for identity fields.
  if (typeof b.email === "string" && b.email.trim() && b.email.trim().toLowerCase() !== (u.email || "")) {
    const e = b.email.trim().toLowerCase();
    if (await User.findOne({ email: e, _id: { $ne: u._id } })) return res.status(409).json({ error: "email already in use" });
    b.email = e;
  }
  if (typeof b.username === "string" && b.username.trim() && b.username.trim() !== (u.username || "")) {
    if (await User.findOne({ username: b.username.trim(), _id: { $ne: u._id } })) return res.status(409).json({ error: "username already in use" });
    b.username = b.username.trim();
  }
  for (const k of USER_EDITABLE) if (k in b) u[k] = b[k];
  try { await u.save(); }
  catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Member ID, email or username already in use." });
    throw e;
  }
  const user = u.toObject();
  delete user.passwordHash;
  res.json({ user });
});

// Set a new login password for a member (admin reset). Invalidates old sessions.
router.post("/users/:id/password", async (req, res) => {
  const pw = String(req.body?.password || "");
  if (pw.length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });
  const u = await User.findById(req.params.id);
  if (!u || u.role === "admin") return res.status(404).json({ error: "no member" });
  u.passwordHash = await bcrypt.hash(pw, 10);
  u.tokenVersion = (u.tokenVersion || 0) + 1;   // sign out existing sessions
  await u.save();
  res.json({ ok: true });
});

// Suspend / unsuspend a member (blocks login + all authenticated access).
router.post("/users/:id/suspend", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role === "admin") return res.status(404).json({ error: "no member" });
  const suspend = req.body?.suspended !== false;
  u.suspended = suspend;
  u.suspendedReason = suspend ? (String(req.body?.reason || "").slice(0, 200) || "Suspended by admin") : undefined;
  u.suspendedAt = suspend ? new Date() : undefined;
  if (suspend) u.tokenVersion = (u.tokenVersion || 0) + 1;   // kick active sessions
  u.notifications.push({ text: suspend ? "Your account has been suspended. Contact support." : "Your account has been reactivated.", type: suspend ? "error" : "success" });
  await u.save();
  res.json({ user: u });
});

// Force sign-out of all the member's devices.
router.post("/users/:id/force-logout", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.tokenVersion = (u.tokenVersion || 0) + 1;
  await u.save();
  res.json({ ok: true });
});

// Disable a member's 2FA (e.g. they lost their device).
router.post("/users/:id/2fa-disable", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.twoFactorEnabled = false;
  u.twoFactorSecret = undefined;
  await u.save();
  res.json({ ok: true });
});

// Set any verification sub-fields (and level) directly.
const VERIFY_FIELDS = ["level", "fullName", "phone", "country", "idType", "idNumber", "idImageUrl", "reviewNote"];
router.post("/users/:id/verification", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  if (!u.verification) u.verification = {};
  const b = req.body || {};
  if (b.level && !["none", "basic", "standard", "pending_premium", "premium"].includes(b.level)) return res.status(400).json({ error: "bad level" });
  for (const k of VERIFY_FIELDS) if (k in b) u.verification[k] = b[k];
  u.verification.reviewedAt = new Date();
  await u.save();
  res.json({ user: u });
});

// Set or clear a member's investment directly.
router.post("/users/:id/investment", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  const b = req.body || {};
  if (b.clear) {
    u.investment = { tier: 0, amount: 0, startedAt: null, lockUntil: null, lastPayoutAt: null };
  } else {
    u.investment = u.investment || {};
    if (b.tier != null) u.investment.tier = Number(b.tier);
    if (b.amount != null) u.investment.amount = Number(b.amount);
    if (b.lockUntil !== undefined) u.investment.lockUntil = b.lockUntil ? new Date(b.lockUntil) : null;
    if (!u.investment.startedAt) u.investment.startedAt = new Date();
    if (!u.investment.lastPayoutAt) u.investment.lastPayoutAt = new Date();
  }
  await u.save();
  res.json({ user: u });
});

// Manage a member's saved payout wallets: remove one, or clear its 24h hold.
router.post("/users/:id/payout-wallet/:idx", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  const i = Number(req.params.idx);
  if (!u.payoutWallets || !u.payoutWallets[i]) return res.status(404).json({ error: "no wallet" });
  if (req.body?.action === "remove") u.payoutWallets.splice(i, 1);
  else if (req.body?.action === "clear-hold") { u.payoutWallets[i].active = true; }
  else return res.status(400).json({ error: "action must be remove or clear-hold" });
  await u.save();
  res.json({ user: u });
});

// Clear all of a member's notifications.
router.post("/users/:id/notifications/clear", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.notifications = [];
  await u.save();
  res.json({ ok: true });
});

// Apply a penalty / freeze: debits the member's balance (it can go negative),
// marks the account in deficit, and blocks all earning + withdraw + invest until
// an admin clears it. `amount` is what the member must send to restore.
router.post("/users/:id/penalty", async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "amount must be a positive number" });
  const u = await User.findById(req.params.id);
  if (!u || u.role === "admin") return res.status(404).json({ error: "no member" });
  const reason = String(req.body?.reason || "").slice(0, 300) || "Account penalty";
  const oldBal = u.balance;
  u.balance = +(u.balance - amount).toFixed(2);
  await logChange(u._id, oldBal, -amount, u.balance, "Penalty");
  u.frozen = { active: true, amount, reason, at: new Date() };
  u.notifications.push({ text: `⚠️ Your account is in deficit (-$${amount.toLocaleString()}). Reason: ${reason}. Contact support to restore your account.`, type: "error" });
  await u.save();
  await Transaction.create({ user: u._id, type: "penalty", amount: -amount, note: reason });
  res.json({ user: u });
});

// Clear the penalty: admin enters the amount the member sent. That amount is
// credited to the balance and the freeze is lifted. (Only an admin can clear it —
// ordinary deposits do not.)
router.post("/users/:id/penalty/resolve", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  if (!u.frozen?.active) return res.status(400).json({ error: "account is not frozen" });
  const amount = req.body?.amount == null ? (u.frozen.amount || 0) : Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: "bad amount" });
  const oldBalR = u.balance;
  u.balance = +(u.balance + amount).toFixed(2);
  if (amount > 0) await logChange(u._id, oldBalR, amount, u.balance, "Penalty Cleared");
  u.frozen = { active: false, amount: 0, reason: undefined, at: undefined };
  u.notifications.push({ text: `✅ Payment received — your account has been restored.${amount ? ` $${amount.toLocaleString()} credited.` : ""}`, type: "success" });
  await u.save();
  if (amount > 0) await Transaction.create({ user: u._id, type: "adjustment", amount, note: "penalty cleared — payment received" });
  res.json({ user: u });
});

// Impersonate: issue a short-lived member token so an admin can see / act in the
// member's own view for support. Honours the member's current tokenVersion.
router.post("/users/:id/login-as", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role === "admin") return res.status(404).json({ error: "no member" });
  const token = jwt.sign({ id: u._id.toString(), tv: u.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "2h" });
  res.json({ token, user: { id: u._id, username: u.username, email: u.email } });
});

// Permanently delete a member and cascade their owned records. Customers only.
router.delete("/users/:id", async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ error: "cannot delete yourself" });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  if (u.role === "admin") return res.status(400).json({ error: "use the Admins page to remove operators" });
  await Promise.all([
    Transaction.deleteMany({ user: u._id }),
    AnalystSubmission.deleteMany({ user: u._id }),
    LoginHistory.deleteMany({ user: u._id }),
    SupportMessage.deleteMany({ user: u._id }),
    ChatMessage.deleteMany({ user: u._id }),
    User.updateMany({ referredBy: u._id }, { $set: { referredBy: null } }),
  ]);
  await u.deleteOne();
  res.json({ ok: true });
});
router.post("/users/:id/reset-cycle", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.analyst.cycleCount = 0;
  u.analyst.pendingProduct = null;
  u.analyst.pendingProfitPct = null;
  u.analyst.pendingAdjustedProfitPct = null;
  await u.save();
  res.json({ user: u });
});

// Override a member's verification level (e.g. approve pending_premium → premium).
const VERIFY_LEVELS = ["none", "basic", "standard", "pending_premium", "premium"];
router.post("/users/:id/verify", async (req, res) => {
  const { level, note } = req.body || {};
  if (!VERIFY_LEVELS.includes(level)) return res.status(400).json({ error: "bad level" });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  if (!u.verification) u.verification = {};
  u.verification.level = level;
  u.verification.reviewedAt = new Date();
  if (note) u.verification.reviewNote = note;
  u.notifications.push({ text: `Your verification level is now ${level.replace(/_/g, " ")}.`, type: level === "premium" ? "success" : "info" });
  await u.save();
  res.json({ user: u });
});

router.post("/users/:id/adjust-balance", async (req, res) => {
  const { amount, note } = req.body || {};
  // Which wallet to adjust: "invest" = investment wallet, else analysis balance.
  const wallet = req.body?.wallet === "invest" ? "invest" : "analysis";
  const field = wallet === "invest" ? "investBalance" : "balance";
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  const old = +(u[field] || 0);
  u[field] = +(old + Number(amount || 0)).toFixed(2);
  await u.save();
  await Transaction.create({ user: u._id, type: "adjustment", amount: Number(amount || 0), note: note || `admin adjust (${wallet})`, meta: { wallet } });
  await logChange(u._id, old, Number(amount || 0), u[field], (note || "Admin Adjustment") + (wallet === "invest" ? " (investment)" : ""));
  // Crediting the analysis balance of a member with a combo deficit auto-settles it.
  if (wallet === "analysis" && Number(amount || 0) > 0) await settleCombo(u._id).catch(() => {});
  res.json({ user: await User.findById(u._id) });
});

router.post("/users/:id/adjust-next-product", async (req, res) => {
  const { profitPct, productId } = req.body || {};
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.analyst.pendingAdjustedProfitPct = profitPct ?? null;
  if (productId) u.analyst.pendingProduct = productId;
  await u.save();
  res.json({ user: u });
});

// Products
router.get("/products", async (req, res) => res.json({ items: await Product.find().sort({ createdAt: -1 }) }));
router.post("/products", async (req, res) => res.json({ item: await Product.create(req.body) }));
router.patch("/products/:id", async (req, res) => res.json({ item: await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/products/:id", async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// Deposit wallets
router.get("/deposit-wallets", async (req, res) => res.json({ items: await DepositWallet.find() }));
router.post("/deposit-wallets", async (req, res) => res.json({ item: await DepositWallet.create(req.body) }));
router.patch("/deposit-wallets/:id", async (req, res) => res.json({ item: await DepositWallet.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/deposit-wallets/:id", async (req, res) => { await DepositWallet.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// Mentors. A mentor profile is a persona members pick; `owner` is the admin
// operator who replies as that mentor from "My Juniors". One admin may own many
// mentors (they present as each one to that mentor's own members).
async function mentorWithOwner(m) {
  const obj = m.toObject ? m.toObject() : m;
  if (obj.owner) {
    const o = await User.findById(obj.owner).select("username email").catch(() => null);
    obj.ownerName = o ? (o.username || o.email) : null;
  }
  // How many members chose this mentor.
  obj.menteeCount = await User.countDocuments({ mentor: obj._id, role: "customer" });
  return obj;
}
router.get("/mentors", async (req, res) => {
  const list = await Mentor.find().sort({ createdAt: 1 });
  res.json({ items: await Promise.all(list.map(mentorWithOwner)) });
});
router.post("/mentors", async (req, res) => res.json({ item: await Mentor.create(req.body) }));
router.patch("/mentors/:id", async (req, res) => res.json({ item: await Mentor.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
// Assign (or clear) the admin who controls this mentor. ownerId null = auto-reply only.
router.patch("/mentors/:id/owner", async (req, res) => {
  const { ownerId } = req.body || {};
  let owner = null;
  if (ownerId) {
    const op = await User.findById(ownerId).select("role");
    if (!op || op.role !== "admin") return res.status(400).json({ error: "owner must be an admin operator" });
    owner = op._id;
  }
  const m = await Mentor.findByIdAndUpdate(req.params.id, { owner }, { new: true });
  if (!m) return res.status(404).json({ error: "no mentor" });
  res.json({ item: await mentorWithOwner(m) });
});
router.delete("/mentors/:id", async (req, res) => {
  // Unassign members so they can pick a new mentor; then remove the profile.
  await User.updateMany({ mentor: req.params.id }, { $set: { mentor: null } });
  await Mentor.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Transactions review (optional ?status= and ?type= filters).
router.get("/tx", async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.type) q.type = req.query.type;
  res.json({ items: await Transaction.find(q).sort({ createdAt: -1 }).limit(500).populate("user") });
});
router.post("/tx/:id/approve", async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: "no tx" });
  if (tx.status !== "pending") return res.status(400).json({ error: "already resolved" });
  tx.status = "approved";
  tx.processingStage = "completed";
  tx.stageHistory.push({ stage: "completed", at: new Date(), note: "Approved by staff" });
  if (tx.type === "deposit") {
    const u = await User.findById(tx.user);
    const old = u.balance;
    u.balance = +(u.balance + tx.amount).toFixed(2);
    await u.save();
    await logChange(u._id, old, tx.amount, u.balance, "Deposit Approved");
    sendDepositApproved(u, tx.amount).catch(() => {});
    // If this deposit clears a combo deficit, auto-settle it (returns balance + commission).
    await settleCombo(u._id).catch(() => {});
  }
  await tx.save();
  res.json({ tx });
});
router.post("/tx/:id/reject", async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: "no tx" });
  if (tx.status !== "pending") return res.status(400).json({ error: "already resolved" });
  tx.status = "rejected";
  tx.processingStage = "rejected";
  tx.stageHistory.push({ stage: "rejected", at: new Date(), note: "Rejected by staff" });
  if (tx.type === "withdrawal") {
    const u = await User.findById(tx.user);
    const old = u.balance;
    u.balance = +(u.balance + tx.amount).toFixed(2);
    await u.save();
    await logChange(u._id, old, tx.amount, u.balance, "Withdrawal Refunded");
  }
  await tx.save();
  res.json({ tx });
});

// Richer stage transitions for deposits/withdrawals. Terminal stages keyed off
// the current status so balance is never credited/refunded twice.
const TX_STAGES = ["submitted", "under_review", "processing", "completed", "requires_verification", "rejected"];
router.post("/tx/:id/stage", async (req, res) => {
  const { stage, note } = req.body || {};
  if (!TX_STAGES.includes(stage)) return res.status(400).json({ error: "bad stage" });
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: "no tx" });

  tx.processingStage = stage;
  tx.stageHistory.push({ stage, at: new Date(), note: note || undefined });

  if (stage === "completed" && tx.status === "pending") {
    if (tx.type === "deposit") {
      const u = await User.findById(tx.user);
      if (u) {
        const old = u.balance;
        u.balance = +(u.balance + tx.amount).toFixed(2); await u.save();
        await logChange(u._id, old, tx.amount, u.balance, "Deposit Approved");
        await settleCombo(u._id).catch(() => {});
      }
      tx.status = "approved";
    } else {
      tx.status = "complete";
    }
  }
  if (stage === "rejected" && tx.status === "pending") {
    tx.status = "rejected";
    if (tx.type === "withdrawal") {
      const u = await User.findById(tx.user);
      if (u) { u.balance = +(u.balance + tx.amount).toFixed(2); await u.save(); }
    }
  }
  await tx.save();

  const u = await User.findById(tx.user);
  if (u) {
    u.notifications.push({ text: `Your ${tx.type} of $${tx.amount} is now ${stage.replace(/_/g, " ")}.`, type: stage === "rejected" ? "warning" : "info" });
    await u.save();
    if (tx.type === "withdrawal") sendWithdrawalStatus(u, tx.amount, stage).catch(() => {});
    else if (tx.type === "deposit" && stage === "completed") sendDepositApproved(u, tx.amount).catch(() => {});
  }
  res.json({ tx });
});

// Settings (generic key/value). GET returns defaults merged with stored rows.
router.get("/settings", async (req, res) => {
  const rows = await Setting.find();
  const map = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  res.json({ settings: map });
});
router.put("/settings/:key", async (req, res) => {
  const { value } = req.body || {};
  const row = await Setting.findOneAndUpdate(
    { key: req.params.key }, { value }, { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ setting: row });
});

// Announcements
router.get("/announcements", async (req, res) => res.json({ items: await Announcement.find().sort({ pinned: -1, publishedAt: -1 }) }));
router.post("/announcements", async (req, res) => {
  const { title, body, type, pinned, active, publishedAt } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "title required" });
  const item = await Announcement.create({
    title: title.trim(), body: body || "", type: type || "news",
    pinned: !!pinned, active: active !== false,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
  });
  res.json({ item });
});
router.patch("/announcements/:id", async (req, res) => res.json({ item: await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/announcements/:id", async (req, res) => { await Announcement.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// Personas (AI community members)
router.get("/personas", async (req, res) => res.json({ items: await Persona.find().sort({ createdAt: -1 }) }));
router.post("/personas", async (req, res) => res.json({ item: await Persona.create(req.body) }));
router.patch("/personas/:id", async (req, res) => res.json({ item: await Persona.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/personas/:id", async (req, res) => { await Persona.findByIdAndDelete(req.params.id); res.json({ ok: true }); });
// Bulk top-up personas to a target count using the weighted identity pool (real
// faces, US/UK/CA-heavy). Idempotent: only adds what's missing, never deletes.
router.post("/personas/seed", async (req, res) => {
  const { pool } = require("../utils/fakeIdentities");
  const TITLES = ["Watch collector", "FX trader", "Handbag enthusiast", "Latest-collection fan", "Weekend analyst", "Long-term investor", "Scarf specialist", "Portfolio builder", "Sneaker hunter", "Steady saver", "Perfume reviewer", "Tier climber", "Belt & accessories", "Daily grinder", "Compounding fan", "Dress curator", "Early riser", "Patient trader", "Jacket reviewer", "Sunglasses picks", "Diamond-tier saver", "Community helper", "Momentum trader", "Value hunter"];
  const target = Math.min(1000, Math.max(1, Number(req.body?.target) || 400));
  // reset:true wipes all personas first, so the whole set is rebuilt unique
  // (needed to replace older non-unique avatars/names).
  if (req.body?.reset) await Persona.deleteMany({});
  const existing = await Persona.find().select("name");
  const have = new Set(existing.map(p => p.name));
  const need = target - existing.length;
  if (need <= 0) return res.json({ added: 0, total: existing.length });
  const docs = [];
  let n = 0;
  for (const p of pool()) {
    if (docs.length >= need) break;
    if (have.has(p.name)) continue;
    have.add(p.name);
    const i = n++;
    docs.push({ name: p.name, title: TITLES[i % TITLES.length], avatar: p.avatar, group: i % 3 === 0 ? "daily" : i % 3 === 1 ? "invest" : "both", canReply: i % 4 !== 0, active: true });
  }
  if (docs.length) await Persona.insertMany(docs);
  res.json({ added: docs.length, total: await Persona.estimatedDocumentCount() });
});

// Editorial community posting: admin publishes a message through an official
// Shein staff announcement account (shown to users with a staff badge).
router.post("/chat/:group", async (req, res) => {
  const { authorName, authorAvatar, canReply = false } = req.body || {};
  const group = req.params.group;
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  let replyTo;
  if (req.body?.replyTo) {
    const ref = await ChatMessage.findOne({ _id: req.body.replyTo, group }).catch(() => null);
    if (ref) replyTo = { id: ref._id, authorName: ref.authorName, text: String(ref.text || "").slice(0, 140) };
  }
  const mentions = [...new Set((text.match(/@([A-Za-z0-9._-]{2,30})/g) || []).map(s => s.slice(1)))];
  const msg = await ChatMessage.create({ group, authorType: "staff", authorName: authorName || "Shein Staff", authorAvatar, text, canReply, replyTo, mentions });
  res.json({ msg });
});
// Moderation: list recent messages in a group (newest first) and delete any message.
router.get("/chat/:group", async (req, res) => {
  const items = await ChatMessage.find({ group: req.params.group }).sort({ createdAt: -1 }).limit(200);
  res.json({ items });
});
router.delete("/chat/message/:id", async (req, res) => {
  await ChatMessage.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ---- Combos (admin-planted forced-deposit lots) ----
router.get("/combos", async (req, res) => {
  const q = req.query.userId ? { user: req.query.userId } : {};
  res.json({ items: await Combo.find(q).sort({ createdAt: -1 }).limit(500).populate("user", "username email accountNumber") });
});
router.post("/combos", async (req, res) => {
  const { userId, comboAt, negativeAmount, commission, products } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId required" });
  if (!Number.isFinite(Number(comboAt)) || Number(comboAt) < 1) return res.status(400).json({ error: "comboAt must be >= 1" });
  if (!Number.isFinite(Number(negativeAmount)) || Number(negativeAmount) <= 0) return res.status(400).json({ error: "negativeAmount must be > 0" });
  const item = await Combo.create({
    user: userId, comboAt: Number(comboAt), negativeAmount: Number(negativeAmount),
    commission: Number(commission) || 20,
    products: Array.isArray(products) && products.length ? products : [{ name: "Deluxe Combo Lot", value: Number(negativeAmount) }],
  });
  // The combo stays pending and auto-purchases when the member reaches order
  // #comboAt of the day (handled in /analyst/next).
  res.json({ item });
});
router.patch("/combos/:id", async (req, res) => res.json({ item: await Combo.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/combos/:id", async (req, res) => { await Combo.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// ---- Account changes (balance audit ledger) ----
router.get("/account-changes", async (req, res) => {
  const q = req.query.userId ? { user: req.query.userId } : {};
  res.json({ items: await AccountChange.find(q).sort({ createdAt: -1 }).limit(500).populate("user", "username email accountNumber") });
});

// ---- CMS pages ----
router.get("/pages", async (req, res) => res.json({ items: await Page.find().sort({ updatedAt: -1 }) }));
router.post("/pages", async (req, res) => {
  const { title, slug, content, active } = req.body || {};
  if (!title || !slug) return res.status(400).json({ error: "title + slug required" });
  const s = String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
  if (await Page.findOne({ slug: s })) return res.status(409).json({ error: "slug already exists" });
  res.json({ item: await Page.create({ title, slug: s, content: content || "", active: active !== false }) });
});
router.patch("/pages/:id", async (req, res) => res.json({ item: await Page.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/pages/:id", async (req, res) => { await Page.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// ---- Contact / newsletter submissions ----
router.get("/contact", async (req, res) => {
  const q = {};
  if (req.query.kind) q.kind = req.query.kind;
  res.json({ items: await ContactMessage.find(q).sort({ createdAt: -1 }).limit(500) });
});
router.post("/contact/:id/handled", async (req, res) => res.json({ item: await ContactMessage.findByIdAndUpdate(req.params.id, { handled: req.body?.handled !== false }, { new: true }) }));
router.delete("/contact/:id", async (req, res) => { await ContactMessage.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// ---- Admin activity notifications ----
router.get("/notifications", async (req, res) => {
  const q = {};
  if (req.query.type) q.type = req.query.type;
  if (req.query.unread === "1") q.read = false;
  const [items, unread] = await Promise.all([
    AdminNotification.find(q).sort({ createdAt: -1 }).limit(Number(req.query.limit) || 100),
    AdminNotification.countDocuments({ read: false }),
  ]);
  res.json({ items, unread });
});
router.post("/notifications/read", async (req, res) => {
  if (req.body?.all) await AdminNotification.updateMany({ read: false }, { $set: { read: true } });
  else if (req.body?.id) await AdminNotification.updateOne({ _id: req.body.id }, { $set: { read: true } });
  res.json({ ok: true });
});
router.delete("/notifications", async (req, res) => {
  // Clear read (default) or all.
  await AdminNotification.deleteMany(req.query.all === "1" ? {} : { read: true });
  res.json({ ok: true });
});
// Notification types + current mute state (for the dashboard mute UI).
router.get("/notif-config", async (req, res) => {
  const keys = NOTIF_TYPES.map(t => `muteNotif_${t}`);
  const s = await getSettings(keys);
  const mutes = {};
  NOTIF_TYPES.forEach(t => { mutes[t] = s[`muteNotif_${t}`] === true || s[`muteNotif_${t}`] === "true"; });
  res.json({ types: NOTIF_TYPES, mutes });
});

module.exports = router;
