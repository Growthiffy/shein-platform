const router = require("express").Router();
const { auth } = require("../middleware/auth");
const DepositWallet = require("../models/DepositWallet");
const Transaction = require("../models/Transaction");

router.get("/deposit-addresses", auth, async (req, res) => {
  const list = await DepositWallet.find({ active: true });
  res.json({ items: list });
});

router.post("/deposit", auth, async (req, res) => {
  const { amount, chain, address, txHash, slipUrl } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: "bad amount" });
  const tx = await Transaction.create({
    user: req.user._id, type: "deposit",
    amount: Number(amount), chain, address, txHash, slipUrl,
    status: "pending",
  });
  res.json({ tx });
});

router.post("/withdraw", auth, async (req, res) => {
  const { amount, chain, address } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: "bad amount" });
  if (amount > req.user.balance) return res.status(400).json({ error: "insufficient balance" });
  const tx = await Transaction.create({
    user: req.user._id, type: "withdrawal",
    amount: Number(amount), chain, address, status: "pending",
  });
  // soft-hold: deduct immediately; refund on reject
  req.user.balance = +(req.user.balance - amount).toFixed(2);
  await req.user.save();
  res.json({ tx, balance: req.user.balance });
});

router.get("/history", auth, async (req, res) => {
  const items = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
  res.json({ items });
});

module.exports = router;
