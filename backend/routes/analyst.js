const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Product = require("../models/Product");
const AnalystSubmission = require("../models/AnalystSubmission");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { nextProductForUser, levelFor } = require("../utils/pricing");
const { PRODUCTS_PER_CYCLE } = require("../config/levels");
const { getSetting } = require("../utils/settings");
const { ensureProductMeta, validateComment, qualityScore } = require("../utils/analystContent");

const VALID_RECS = ["stock_more", "maintain", "reduce", "discontinue"];
function rating(v) { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; }

// Return (or pick) the next product for this user, with buying rate / sale / profit prefilled.
router.get("/next", auth, async (req, res) => {
  const u = req.user;
  if (u.analyst.cycleCount >= PRODUCTS_PER_CYCLE) {
    return res.json({ done: true, cycleCount: u.analyst.cycleCount });
  }

  // Cooldown: block fetching the next product until the gap after a submit passes.
  const cooldownSec = Number(await getSetting("analystCooldownSec")) || 45;
  if (u.analyst.lastSubmitAt && !u.analyst.pendingProduct) {
    const availableAt = new Date(u.analyst.lastSubmitAt).getTime() + cooldownSec * 1000;
    if (Date.now() < availableAt) {
      return res.json({ cooldown: true, availableAt, cooldownSec });
    }
  }

  let product = null;
  if (u.analyst.pendingProduct) product = await Product.findById(u.analyst.pendingProduct);
  if (!product) {
    // random active product; if admin pre-selected a specific product, honored by pendingProduct
    const count = await Product.countDocuments({ active: true });
    if (!count) return res.status(503).json({ error: "no products" });
    const skip = Math.floor(Math.random() * count);
    product = await Product.findOne({ active: true }).skip(skip);
    u.analyst.pendingProduct = product._id;
    // Snapshot the profit % at first show so it stays stable this product.
    const lvl = levelFor(u.balance);
    u.analyst.pendingProfitPct = product.isLatest ? lvl.latestPct : lvl.normalPct;
    await u.save();
  }

  await ensureProductMeta(product); // backfill category + market brief for old docs

  const q = nextProductForUser(u, product);
  res.json({
    cycleIndex: u.analyst.cycleCount + 1,
    product: {
      id: product._id, brand: product.brand, name: product.name, image: product.image,
      originalPrice: product.originalPrice, isLatest: product.isLatest,
      category: product.category, marketBrief: product.marketBrief,
    },
    quote: q,
    remaining: PRODUCTS_PER_CYCLE - u.analyst.cycleCount,
  });
});

router.post("/submit", auth, async (req, res) => {
  const { comment, demandRating, qualityRating, priceRating, recommendation } = req.body || {};
  const u = req.user;

  // Structured ratings + recommendation are all required.
  if (u.frozen?.active) return res.status(403).json({ error: `Your account is in deficit. Clear the outstanding $${Number(u.frozen.amount || 0).toLocaleString()} to resume earning.`, frozen: true });
  const dR = rating(demandRating), qR = rating(qualityRating), pR = rating(priceRating);
  if (dR === null || qR === null || pR === null || !VALID_RECS.includes(recommendation)) {
    return res.status(400).json({ error: "All ratings (1-5) and a recommended action are required." });
  }
  // Comment quality gate.
  const vErr = validateComment(comment);
  if (vErr) return res.status(400).json({ error: vErr });

  if (!u.analyst.pendingProduct) return res.status(400).json({ error: "no active product" });
  const product = await Product.findById(u.analyst.pendingProduct);
  if (!product) return res.status(400).json({ error: "product gone" });

  const q = nextProductForUser(u, product);
  const score = qualityScore();

  // Atomic claim: credit the commission and advance the cycle only if this is
  // still the user's pending product, so two concurrent submits can't pay twice.
  const claim = await User.findOneAndUpdate(
    { _id: u._id, "analyst.pendingProduct": product._id },
    {
      $inc: { balance: q.profitAmount, totalEarned: q.profitAmount, "analyst.cycleCount": 1 },
      $set: { "analyst.pendingProduct": null, "analyst.pendingProfitPct": null, "analyst.pendingAdjustedProfitPct": null, "analyst.lastSubmitAt": new Date() },
    },
    { new: true }
  );
  if (!claim) return res.status(400).json({ error: "this product was already submitted" });

  const sub = await AnalystSubmission.create({
    user: u._id, product: product._id,
    cycleIndex: claim.analyst.cycleCount,
    buyingRate: q.buyingRate, salePrice: q.salePrice,
    profitPct: q.profitPct, profitAmount: q.profitAmount,
    isLatest: product.isLatest, comment: String(comment).trim(),
    demandRating: dR, qualityRating: qR, priceRating: pR, recommendation,
    qualityScore: score, status: "complete",
  });

  await Transaction.create({ user: u._id, type: "commission", amount: q.profitAmount, note: `Product ${product.brand} ${product.name}` });

  const cooldownSec = Number(await getSetting("analystCooldownSec")) || 45;
  const balance = +Number(claim.balance).toFixed(2);
  const cycleComplete = claim.analyst.cycleCount >= PRODUCTS_PER_CYCLE;

  res.json({
    ok: true, submission: sub, balance, cycleCount: claim.analyst.cycleCount,
    commission: q.profitAmount, qualityScore: score,
    cooldownSec, availableAt: Date.now() + cooldownSec * 1000,
    cycleComplete,
  });
});

router.get("/history", auth, async (req, res) => {
  const list = await AnalystSubmission.find({ user: req.user._id }).populate("product").sort({ createdAt: -1 }).limit(200);
  res.json({ items: list });
});

module.exports = router;
