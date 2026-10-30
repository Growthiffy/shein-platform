const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Product = require("../models/Product");
const AnalystSubmission = require("../models/AnalystSubmission");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Combo = require("../models/Combo");
const { nextProductForUser, levelFor } = require("../utils/pricing");
const { PRODUCTS_PER_CYCLE } = require("../config/levels");
const { getSetting } = require("../utils/settings");
const { ensureProductMeta, validateComment, qualityScore } = require("../utils/analystContent");
const { logChange } = require("../utils/ledger");
const { triggerCombo, settleCombo } = require("../utils/combo");
const { notifyAdmins } = require("../utils/adminNotify");
const uname = u => u.username || (u.email ? u.email.split("@")[0] : "member");

const VALID_RECS = ["stock_more", "maintain", "reduce", "discontinue"];
function rating(v) { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; }
const r2 = n => Math.round(Number(n || 0) * 100) / 100;
const dayStr = () => new Date().toISOString().slice(0, 10);
const comboCommission = c => r2((Number(c.negativeAmount) > 0 ? Number(c.negativeAmount) : Number(c.comboPrice)) * (Number(c.commission || 20) / 100));

// Premium fallback images for a combo lot when none is set on the product.
const COMBO_IMGS = [
  "https://images.unsplash.com/photo-1732246449812-322e6ef728f9?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1645276241987-7a7c14bf88f9?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1698877577733-65ae7dee328c?w=700&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1732139637224-95da5661d5ed?w=700&q=80&auto=format&fit=crop",
];
const comboImg = id => COMBO_IMGS[Math.abs(String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COMBO_IMGS.length];

// Shape the combo for the client. shortfall = how far below 0 the balance is.
function comboPayload(combo, balance) {
  const p = (combo.products && combo.products[0]) || {};
  const commission = comboCommission(combo);
  const shortfall = Math.max(0, -Number(balance));
  return {
    combo: true, comboId: String(combo._id), blocked: shortfall > 0,
    product: { id: "combo:" + combo._id, brand: "Shein Deluxe", name: p.name || "Combo Lot", image: p.image || comboImg(combo._id), originalPrice: combo.comboPrice, isLatest: true, category: "fashion", marketBrief: "Premium combo lot — high-commission deluxe order." },
    comboPrice: r2(combo.comboPrice), commission, needRecharge: r2(shortfall), balance: r2(balance),
    message: shortfall > 0
      ? `Deluxe combo lot — add $${shortfall.toLocaleString()} to your balance, then complete it to unlock $${commission.toLocaleString()} commission.`
      : `Deluxe combo lot ready — complete it to receive $${commission.toLocaleString()} commission.`,
    remaining: PRODUCTS_PER_CYCLE - (combo._cycle || 0),
  };
}

// Return (or trigger) the next lot. A due combo always takes priority.
router.get("/next", auth, async (req, res) => {
  const u = req.user;

  // --- Combo: auto-purchases when the member reaches order #comboAt of the day. ---
  const ordersTodayNow = u.analyst.lastOrderDay === dayStr() ? (u.analyst.ordersToday || 0) : 0;
  let combo = await Combo.findOne({ user: u._id, status: "active" }).sort({ createdAt: 1 });
  if (!combo) { const t = await triggerCombo(u._id, ordersTodayNow); if (t) { combo = t.combo; u.balance = t.balance; } }
  if (combo && Number(u.balance) >= 0) {
    // Balance back to >= 0 (deposit confirmed) — settle now, then fall through to a normal lot.
    const s = await settleCombo(u._id);
    if (s) { u.balance = s.balance; combo = null; }
  }
  if (combo) return res.json(comboPayload(combo, u.balance));

  if (u.analyst.cycleCount >= PRODUCTS_PER_CYCLE) return res.json({ done: true, cycleCount: u.analyst.cycleCount });

  // Daily limit.
  const dailyLimit = Number(await getSetting("dailyAnalysisLimit")) || 30;
  const ordersToday = u.analyst.lastOrderDay === dayStr() ? (u.analyst.ordersToday || 0) : 0;
  if (ordersToday >= dailyLimit) return res.json({ dailyLimit: true, ordersToday, limit: dailyLimit });

  // Cooldown.
  const cooldownSec = Number(await getSetting("analystCooldownSec")) || 10;
  if (u.analyst.lastSubmitAt && !u.analyst.pendingProduct) {
    const availableAt = new Date(u.analyst.lastSubmitAt).getTime() + cooldownSec * 1000;
    if (Date.now() < availableAt) return res.json({ cooldown: true, availableAt, cooldownSec });
  }

  let product = null;
  if (u.analyst.pendingProduct) product = await Product.findById(u.analyst.pendingProduct);
  if (!product) {
    const count = await Product.countDocuments({ active: true });
    if (!count) return res.status(503).json({ error: "no products" });
    const skip = Math.floor(Math.random() * count);
    product = await Product.findOne({ active: true }).skip(skip);
    u.analyst.pendingProduct = product._id;
    const lvl = levelFor(u.balance);
    u.analyst.pendingProfitPct = product.isLatest ? lvl.latestPct : lvl.normalPct;
    await u.save();
  }

  await ensureProductMeta(product);

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
    stats: { ordersToday, dailyLimit },
  });
});

// Settle the active combo (normally done automatically when the admin confirms
// the member's deposit; this lets the member app trigger the same settle once
// their balance is back to >= 0).
router.post("/combo/complete", auth, async (req, res) => {
  const u = req.user;
  const combo = await Combo.findOne({ user: u._id, status: "active" }).sort({ createdAt: 1 });
  if (!combo) return res.status(400).json({ error: "no active combo order" });
  if (Number(u.balance) < 0) return res.status(400).json({ error: `Deposit $${(-Number(u.balance)).toFixed(2)} to complete this order — it settles once an admin confirms.`, needRecharge: r2(-Number(u.balance)) });
  const s = await settleCombo(u._id);
  if (!s) return res.status(409).json({ error: "could not settle — try again" });
  notifyAdmins("combo", { title: `Combo settled for ${uname(u)}`, body: `$${s.commission.toLocaleString()} commission`, user: u._id, userName: uname(u), meta: { commission: s.commission } });
  res.json({ ok: true, dividend: s.commission, balance: s.balance });
});

router.post("/submit", auth, async (req, res) => {
  const { comment, demandRating, qualityRating, priceRating, recommendation } = req.body || {};
  const u = req.user;

  if (u.frozen?.active) return res.status(403).json({ error: `Your account is in deficit. Clear the outstanding $${Number(u.frozen.amount || 0).toLocaleString()} to resume earning.`, frozen: true });
  // A due/active combo must be completed before normal submits resume.
  if (await Combo.exists({ user: u._id, status: "active" })) return res.status(400).json({ error: "Complete your pending combo order first.", combo: true });

  const dR = rating(demandRating), qR = rating(qualityRating), pR = rating(priceRating);
  if (dR === null || qR === null || pR === null || !VALID_RECS.includes(recommendation)) {
    return res.status(400).json({ error: "All ratings (1-5) and a recommended action are required." });
  }
  const vErr = validateComment(comment);
  if (vErr) return res.status(400).json({ error: vErr });

  if (!u.analyst.pendingProduct) return res.status(400).json({ error: "no active product" });
  const product = await Product.findById(u.analyst.pendingProduct);
  if (!product) return res.status(400).json({ error: "product gone" });

  // Daily limit (reset counter when the day changes).
  const dailyLimit = Number(await getSetting("dailyAnalysisLimit")) || 30;
  const today = dayStr();
  const newDay = u.analyst.lastOrderDay !== today;
  const ordersToday = newDay ? 0 : (u.analyst.ordersToday || 0);
  if (ordersToday >= dailyLimit) return res.status(400).json({ error: `Daily analysis limit reached (${dailyLimit}). Come back tomorrow.`, dailyLimit: true });

  const q = nextProductForUser(u, product);
  const score = qualityScore();

  const claim = await User.findOneAndUpdate(
    { _id: u._id, "analyst.pendingProduct": product._id },
    {
      $inc: { balance: q.profitAmount, totalEarned: q.profitAmount, "analyst.cycleCount": 1, "analyst.ordersToday": newDay ? -(u.analyst.ordersToday || 0) + 1 : 1, "analyst.todaysCommission": newDay ? -(u.analyst.todaysCommission || 0) + q.profitAmount : q.profitAmount },
      $set: { "analyst.pendingProduct": null, "analyst.pendingProfitPct": null, "analyst.pendingAdjustedProfitPct": null, "analyst.lastSubmitAt": new Date(), "analyst.lastOrderDay": today },
    },
    { new: true }
  );
  if (!claim) return res.status(400).json({ error: "this product was already submitted" });

  await logChange(u._id, r2(Number(claim.balance) - q.profitAmount), q.profitAmount, claim.balance, "Analyst Commission");

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
  notifyAdmins("analyst", { title: `Analyst trade by ${uname(u)}`, body: `${product.brand} ${product.name} — +$${Number(q.profitAmount).toLocaleString()}`, user: u._id, userName: uname(u), meta: { commission: q.profitAmount, product: `${product.brand} ${product.name}` } });

  const cooldownSec = Number(await getSetting("analystCooldownSec")) || 10;
  const cycleComplete = claim.analyst.cycleCount >= PRODUCTS_PER_CYCLE;

  res.json({
    ok: true, submission: sub, balance: r2(claim.balance), cycleCount: claim.analyst.cycleCount,
    commission: q.profitAmount, qualityScore: score,
    cooldownSec, availableAt: Date.now() + cooldownSec * 1000,
    cycleComplete,
    stats: { ordersToday: claim.analyst.ordersToday, dailyLimit },
  });
});

router.get("/history", auth, async (req, res) => {
  const list = await AnalystSubmission.find({ user: req.user._id }).populate("product").sort({ createdAt: -1 }).limit(200);
  res.json({ items: list });
});

module.exports = router;
