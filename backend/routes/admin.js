const router = require("express").Router();
const { auth, admin } = require("../middleware/auth");
const User = require("../models/User");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const DepositWallet = require("../models/DepositWallet");
const Mentor = require("../models/Mentor");
const ChatMessage = require("../models/ChatMessage");
const Setting = require("../models/Setting");
const Persona = require("../models/Persona");
const LoginHistory = require("../models/LoginHistory");
const SupportMessage = require("../models/SupportMessage");
const { DEFAULTS } = require("../utils/settings");

router.use(auth, admin);

// Dashboard stats.
router.get("/stats", async (req, res) => {
  const [users, verified, pendingDeposits, pendingWithdrawals, personas, openSupport] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ emailVerified: true }),
    Transaction.countDocuments({ type: "deposit", status: "pending" }),
    Transaction.countDocuments({ type: "withdrawal", status: "pending" }),
    Persona.countDocuments({ active: true }),
    SupportMessage.countDocuments({ from: "user", readByStaff: false }),
  ]);
  const agg = await Transaction.aggregate([
    { $match: { type: { $in: ["deposit"] }, status: "approved" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const balAgg = await User.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]);
  res.json({
    stats: {
      users, verified,
      pendingDeposits, pendingWithdrawals,
      activePersonas: personas, openSupport,
      depositVolume: agg[0]?.total || 0,
      totalBalances: +(balAgg[0]?.total || 0).toFixed(2),
    },
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

// Users
router.get("/users", async (req, res) => res.json({ items: await User.find().sort({ createdAt: -1 }).limit(500) }));

// Only these fields may be set through the admin edit form. This blocks
// mass-assignment of passwordHash, email, verifyCode, etc. via raw req.body.
const USER_EDITABLE = ["balance", "dailySalary", "level", "username", "emailVerified", "role", "isAdmin", "mentor", "rewardCredit", "totalEarned", "communityAccess", "creditScore", "phone"];
router.patch("/users/:id", async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  for (const k of USER_EDITABLE) {
    if (k in (req.body || {})) u[k] = req.body[k];
  }
  await u.save(); // pre-save hook keeps role <-> isAdmin in sync
  res.json({ user: u });
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

router.post("/users/:id/adjust-balance", async (req, res) => {
  const { amount, note } = req.body || {};
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.balance = +(u.balance + Number(amount || 0)).toFixed(2);
  await u.save();
  await Transaction.create({ user: u._id, type: "adjustment", amount: Number(amount || 0), note: note || "admin adjust" });
  res.json({ user: u });
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

// Mentors
router.get("/mentors", async (req, res) => res.json({ items: await Mentor.find() }));
router.post("/mentors", async (req, res) => res.json({ item: await Mentor.create(req.body) }));
router.patch("/mentors/:id", async (req, res) => res.json({ item: await Mentor.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/mentors/:id", async (req, res) => { await Mentor.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// Transactions review
router.get("/tx", async (req, res) => res.json({ items: await Transaction.find().sort({ createdAt: -1 }).limit(500).populate("user") }));
router.post("/tx/:id/approve", async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: "no tx" });
  if (tx.status !== "pending") return res.status(400).json({ error: "already resolved" });
  tx.status = "approved";
  if (tx.type === "deposit") {
    const u = await User.findById(tx.user);
    u.balance = +(u.balance + tx.amount).toFixed(2);
    await u.save();
  }
  await tx.save();
  res.json({ tx });
});
router.post("/tx/:id/reject", async (req, res) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) return res.status(404).json({ error: "no tx" });
  if (tx.status !== "pending") return res.status(400).json({ error: "already resolved" });
  tx.status = "rejected";
  if (tx.type === "withdrawal") {
    const u = await User.findById(tx.user);
    u.balance = +(u.balance + tx.amount).toFixed(2);
    await u.save();
  }
  await tx.save();
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

// Personas (AI community members)
router.get("/personas", async (req, res) => res.json({ items: await Persona.find().sort({ createdAt: -1 }) }));
router.post("/personas", async (req, res) => res.json({ item: await Persona.create(req.body) }));
router.patch("/personas/:id", async (req, res) => res.json({ item: await Persona.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete("/personas/:id", async (req, res) => { await Persona.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

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

module.exports = router;
