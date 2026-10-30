const router = require("express").Router();
const { auth } = require("../middleware/auth");
const DepositWallet = require("../models/DepositWallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { getSetting, getSettings } = require("../utils/settings");
const { levelFor } = require("../utils/pricing");
const { logChange } = require("../utils/ledger");
const { notifyAdmins } = require("../utils/adminNotify");
const uname = u => u.username || (u.email ? u.email.split("@")[0] : "member");

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
  const invest = +(req.user.investBalance || 0).toFixed(2);
  const pending = +((agg[0]?.total || 0)).toFixed(2);
  res.json({ available, invest, pending, total: +(available + pending).toFixed(2) });
});

router.get("/deposit-addresses", auth, async (req, res) => {
  const list = await DepositWallet.find({ active: true });
  res.json({ items: list });
});

router.post("/deposit", auth, async (req, res) => {
  const { amount, chain, address, txHash, slipUrl } = req.body || {};
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "bad amount" });

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
  notifyAdmins("deposit", { title: `Deposit request — $${amt.toLocaleString()}`, body: `${uname(req.user)} submitted a ${chain || ""} deposit`, user: req.user._id, userName: uname(req.user), meta: { amount: amt, chain, txId: String(tx._id) } });
  res.json({ tx });
});

router.post("/withdraw", auth, async (req, res) => {
  const { amount, chain, address } = req.body || {};
  const amt = Number(amount);
  // Which wallet to draw from: "invest" = investment wallet, else analysis balance.
  const source = req.body?.source === "invest" ? "invest" : "analysis";
  const balField = source === "invest" ? "investBalance" : "balance";
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "bad amount" });
  if (req.user.frozen?.active) return res.status(403).json({ error: `Your account is in deficit. Clear the outstanding $${Number(req.user.frozen.amount || 0).toLocaleString()} to restore withdrawals.`, frozen: true });
  const s = await getSettings(["minWithdrawalUsd", "withdrawalFeeUsd", "withdrawalProcessingHours", "verificationWithdrawalThreshold"]);
  const minWithdrawalUsd = Number(s.minWithdrawalUsd);
  if (amt < minWithdrawalUsd) return res.status(400).json({ error: `below minimum withdrawal of $${minWithdrawalUsd}` });
  // Per-tier withdrawal cap.
  const lvl = levelFor(req.user.balance);
  if (lvl.withdrawLimit != null && amt > lvl.withdrawLimit) {
    return res.status(400).json({ error: `Your ${lvl.name} tier allows up to $${lvl.withdrawLimit.toLocaleString()} per withdrawal. Reach a higher tier to withdraw more.` });
  }

  // Withdrawals may only go to a saved payout wallet. A brand-new address is not
  // accepted here — it must be added first and clear a 24h security hold — so a
  // free-typed address can never bypass the hold.
  const wallet = (req.user.payoutWallets || []).find(w => w.address === address);
  if (!wallet) {
    return res.status(400).json({ error: "Add this address as a payout wallet first. New addresses go through a 24-hour security hold before they can be used." });
  }
  if (wallet.active === false) {
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

  // Atomic soft-hold: deduct only if the live balance still covers it, so two
  // concurrent withdrawals cannot both pass the check and overdraw the account.
  const updated = await User.findOneAndUpdate(
    { _id: req.user._id, [balField]: { $gte: amt } },
    { $inc: { [balField]: -amt } },
    { new: true }
  );
  if (!updated) return res.status(400).json({ error: `insufficient ${source === "invest" ? "investment" : ""} balance`.replace(/\s+/g, " ").trim() });

  let tx;
  try {
    tx = await Transaction.create({
      user: req.user._id, type: "withdrawal",
      amount: amt, chain, address, status: "pending",
      networkFee: fee,
      estimatedCompletionAt: estimatedCompletion,
      processingStage: "submitted",
      stageHistory: [{ stage: "submitted", at: new Date(), note: "Withdrawal request submitted" }],
      meta: { source },
    });
  } catch (e) {
    // Roll the hold back if the ledger write fails, so funds are never stuck.
    await User.updateOne({ _id: req.user._id }, { $inc: { [balField]: amt } }).catch(() => {});
    throw e;
  }
  const balance = +Number(updated.balance).toFixed(2);
  const srcBal = +Number(updated[balField]).toFixed(2);
  await logChange(req.user._id, +(srcBal + amt).toFixed(2), -amt, srcBal, `Withdrawal (hold, ${source})`);
  notifyAdmins("withdrawal", { title: `Withdrawal request — $${amt.toLocaleString()}`, body: `${uname(req.user)} requested a ${chain || ""} withdrawal to ${address}`, user: req.user._id, userName: uname(req.user), meta: { amount: amt, chain, address, txId: String(tx._id) } });
  res.json({
    tx, balance, investBalance: +Number(updated.investBalance || 0).toFixed(2), source,
    breakdown: { amount: amt, networkFee: fee, youReceive: +(amt - fee).toFixed(2), estimatedCompletion },
  });
});

router.get("/history", auth, async (req, res) => {
  const items = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
  res.json({ items });
});

module.exports = router;
