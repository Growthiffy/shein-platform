const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Product = require("../models/Product");
const AnalystSubmission = require("../models/AnalystSubmission");
const Transaction = require("../models/Transaction");
const { nextProductForUser } = require("../utils/pricing");
const { PRODUCTS_PER_CYCLE } = require("../config/levels");

// Return (or pick) the next product for this user, with buying rate / sale / profit prefilled.
router.get("/next", auth, async (req, res) => {
  const u = req.user;
  if (u.analyst.cycleCount >= PRODUCTS_PER_CYCLE) {
    return res.json({ done: true, cycleCount: u.analyst.cycleCount });
  }

  let product = null;
  if (u.analyst.pendingProduct) product = await Product.findById(u.analyst.pendingProduct);
  if (!product) {
    // random active product; if admin forced a specific product via override, honored by pendingProduct
    const count = await Product.countDocuments({ active: true });
    if (!count) return res.status(503).json({ error: "no products" });
    const skip = Math.floor(Math.random() * count);
    product = await Product.findOne({ active: true }).skip(skip);
    u.analyst.pendingProduct = product._id;
    await u.save();
  }

  const q = nextProductForUser(u, product);
  res.json({
    cycleIndex: u.analyst.cycleCount + 1,
    product: { id: product._id, brand: product.brand, name: product.name, image: product.image, originalPrice: product.originalPrice, isLatest: product.isLatest },
    quote: q,
    remaining: PRODUCTS_PER_CYCLE - u.analyst.cycleCount,
  });
});

router.post("/submit", auth, async (req, res) => {
  const { comment } = req.body || {};
  if (!comment || !comment.trim()) return res.status(400).json({ error: "comment required" });
  const u = req.user;
  if (!u.analyst.pendingProduct) return res.status(400).json({ error: "no active product" });

  const product = await Product.findById(u.analyst.pendingProduct);
  if (!product) return res.status(400).json({ error: "product gone" });

  const q = nextProductForUser(u, product);

  const sub = await AnalystSubmission.create({
    user: u._id, product: product._id,
    cycleIndex: u.analyst.cycleCount + 1,
    buyingRate: q.buyingRate, salePrice: q.salePrice,
    profitPct: q.profitPct, profitAmount: q.profitAmount,
    isLatest: product.isLatest, comment: comment.trim(),
    status: "complete",
  });

  u.balance = +(u.balance + q.profitAmount).toFixed(2);
  u.totalEarned = +(u.totalEarned + q.profitAmount).toFixed(2);
  u.analyst.cycleCount += 1;
  u.analyst.pendingProduct = null;
  u.analyst.pendingForcedProfitPct = null;
  await u.save();

  await Transaction.create({ user: u._id, type: "commission", amount: q.profitAmount, note: `Product ${product.brand} ${product.name}` });

  res.json({ ok: true, submission: sub, balance: u.balance, cycleCount: u.analyst.cycleCount });
});

router.get("/history", auth, async (req, res) => {
  const list = await AnalystSubmission.find({ user: req.user._id }).populate("product").sort({ createdAt: -1 }).limit(200);
  res.json({ items: list });
});

module.exports = router;
