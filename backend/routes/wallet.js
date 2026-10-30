const router = require("express").Router();
const { auth } = require("../middleware/auth");
const DepositWallet = require("../models/DepositWallet");
const Transaction = require("../models/Transaction");
const { getSetting, getSettings } = require("../utils/settings");

// Public (to signed-in members) whitelist of wallet limits. Never exposes the
// raw Setting table — only the fields the customer app needs to render.
router.get("/limits", auth, async (req, res) => {
  const s = await getSettings(["minWithdrawalUsd", "withdrawalFeeUsd", "withdrawalProcessingHours", "depositDailyLimit", "depositMonthlyLimit", "verificationWithdrawalThreshold"]);
  res.json({
    minWithdrawalUsd: Number(s.minWithdrawalUsd),
    withdrawalFeeUsd: Number(s.withdrawalFeeUsd),
    withdrawalProcessingHours: Number(s.withdrawalProcessingHours),
    depositDailyLimit: Number(s.depositDailyLimit),
    depositMonthlyLimit: Number(s.depositMonthlyLimit),
    verificationWithdrawalThreshold: Number(s.verificationWithdrawalThreshold),
  });
});

// Available vs pending balance split.
router.get("/balance", auth, async (req, res) => {
  const agg = await Transaction.aggregate([
    { $match: { user: req.user._id, type: "deposit", status: "pending" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const available = +(req.user.balance || 0).toFixed(2);
  const pending = +((agg[0]?.total || 0)).toFixed(2);
  res.json({ available, pending, total: +(available + pending).toFixed(2) });
});

router.get("/deposit-addresses", auth, async (req, res) => {
  const list = await DepositWallet.find({ active: true });
  res.json({ items: list });
});

router.post("/deposit", auth, async (req, res) => {
  const { amount, chain, address, txHash, slipUrl } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: "bad amount" });
  const amt = Number(amount);

  const s = await getSettings(["depositDailyLimit", "depositMonthlyLimit"]);
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const sumSince = async (since) => {
    const a = await Transaction.aggregate([
      { $match: { user: req.user._id, type: "deposit", status: { $in: ["pending", "approved"] }, createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return a[0]?.total || 0;
  };
  if (amt + (await sumSince(dayAgo)) > Number(s.depositDailyLimit)) {
    return res.status(400).json({ error: `This deposit exceeds your daily limit of $${Number(s.depositDailyLimit).toLocaleString()}.` });
  }
  if (amt + (await sumSince(monthAgo)) > Number(s.depositMonthlyLimit)) {
    return res.status(400).json({ error: `This deposit exceeds your monthly limit of $${Number(s.depositMonthlyLimit).toLocaleString()}.` });
  }

  const tx = await Transaction.create({
    user: req.user._id, type: "deposit",
    amount: amt, chain, address, txHash, slipUrl,
    status: "pending",
    processingStage: "submitted",
    stageHistory: [{ stage: "submitted", at: new Date(), note: "Deposit submitted" }],
  });
  res.json({ tx });
});

router.post("/withdraw", auth, async (req, res) => {
  const { amount, chain, address } = req.body || {};
  if (!amount || amount <= 0) return res.status(400).json({ error: "bad amount" });
  const amt = Number(amount);
  const s = await getSettings(["minWithdrawalUsd", "withdrawalFeeUsd", "withdrawalProcessingHours", "verificationWithdrawalThreshold"]);
  const minWithdrawalUsd = Number(s.minWithdrawalUsd);
  if (amt < minWithdrawalUsd) return res.status(400).json({ error: `below minimum withdrawal of $${minWithdrawalUsd}` });
  if (amt > req.user.balance) return res.status(400).json({ error: "insufficient balance" });

  // 24h security hold: reject withdrawals to an address still on hold.
  const wallet = (req.user.payoutWallets || []).find(w => w.address === address);
  if (wallet && wallet.active === false) {
    const until = wallet.addedAt ? new Date(new Date(wallet.addedAt).getTime() + 24 * 3600 * 1000) : null;
    return res.status(400).json({ error: `This withdrawal address is in a 24-hour security hold. Please wait until ${until ? until.toLocaleString() : "the hold clears"}.` });
  }

  // KYC gate: large withdrawals require Standard verification.
  const threshold = Number(s.verificationWithdrawalThreshold);
  const vLevel = req.user.verification?.level || "none";
  const hasStandard = ["standard", "premium"].includes(vLevel);
  if (amt > threshold && !hasStandard) {
    return res.status(403).json({ error: `Withdrawals above $${threshold} require Standard verification. Please complete identity verification in your Profile.`, needsVerification: true });
  }

  const fee = Number(s.withdrawalFeeUsd) || 0;
  const hours = Number(s.withdrawalProcessingHours) || 72;
  const estimatedCompletion = new Date(Date.now() + hours * 3600 * 1000);

  const tx = await Transaction.create({
    user: req.user._id, type: "withdrawal",
    amount: amt, chain, address, status: "pending",
    networkFee: fee,
    estimatedCompletionAt: estimatedCompletion,
    processingStage: "submitted",
    stageHistory: [{ stage: "submitted", at: new Date(), note: "Withdrawal request submitted" }],
  });
  // soft-hold: deduct immediately; refund on reject
  req.user.balance = +(req.user.balance - amt).toFixed(2);
  await req.user.save();
  res.json({
    tx, balance: req.user.balance,
    breakdown: { amount: amt, networkFee: fee, youReceive: +(amt - fee).toFixed(2), estimatedCompletion },
  });
});

router.get("/history", auth, async (req, res) => {
  const items = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
  res.json({ items });
});

module.exports = router;
