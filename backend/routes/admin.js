const router = require("express").Router();
const { auth, admin } = require("../middleware/auth");
const User = require("../models/User");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");
const DepositWallet = require("../models/DepositWallet");
const Mentor = require("../models/Mentor");
const ChatMessage = require("../models/ChatMessage");

router.use(auth, admin);

// Users
router.get("/users", async (req, res) => res.json({ items: await User.find().sort({ createdAt: -1 }).limit(500) }));

// Only these fields may be set through the admin edit form. This blocks
// mass-assignment of passwordHash, email, verifyCode, etc. via raw req.body.
const USER_EDITABLE = ["balance", "dailySalary", "level", "username", "emailVerified", "role", "isAdmin", "mentor", "rewardCredit", "totalEarned"];
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
  u.analyst.pendingForcedProfitPct = null;
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

router.post("/users/:id/force-product", async (req, res) => {
  const { profitPct, productId } = req.body || {};
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "no user" });
  u.analyst.pendingForcedProfitPct = profitPct ?? null;
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

// AI community posting (admin posts as a persona)
router.post("/chat/:group", async (req, res) => {
  const { text, authorName, authorAvatar, canReply = false } = req.body || {};
  const msg = await ChatMessage.create({ group: req.params.group, authorType: "ai", authorName, authorAvatar, text, canReply });
  res.json({ msg });
});

module.exports = router;
