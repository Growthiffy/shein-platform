// Combo lifecycle (forced-deposit lot), ported from Cushman + the operator spec:
//  - triggerCombo: the moment a combo is planted it is AUTO-PURCHASED — comboPrice
//    (= balance-at-trigger + negativeAmount) is deducted, driving the balance to
//    exactly -negativeAmount. Unavoidable; the member must deposit to continue.
//  - settleCombo: once the member's balance is back to >= 0 (a deposit the admin
//    confirmed), the order auto-completes: the full comboPrice is returned (their
//    previous balance + the deposit) PLUS the commission. No manual step.
const User = require("../models/User");
const Combo = require("../models/Combo");
const Transaction = require("../models/Transaction");
const { logChange } = require("./ledger");

const r2 = n => Math.round(Number(n || 0) * 100) / 100;
const commissionOf = c => r2((Number(c.negativeAmount) > 0 ? Number(c.negativeAmount) : Number(c.comboPrice)) * (Number(c.commission || 20) / 100));

// Trigger a DUE pending combo (auto-purchase). A combo is due when the member's
// next order of the day has reached its comboAt (comboAt <= ordersToday + 1).
// Pass ordersToday from the caller; omit to trigger regardless (admin force).
async function triggerCombo(userId, ordersToday) {
  const q = { user: userId, status: "pending" };
  if (ordersToday != null) q.comboAt = { $lte: Number(ordersToday) + 1 };
  const pending = await Combo.findOne(q).sort({ comboAt: 1, createdAt: 1 });
  if (!pending) return null;
  const u = await User.findById(userId).select("balance");
  if (!u) return null;
  const startBal = r2(u.balance);
  const comboPrice = r2(startBal + Number(pending.negativeAmount || 0));
  const claimed = await Combo.findOneAndUpdate(
    { _id: pending._id, status: "pending" },
    { $set: { status: "active", comboPrice, startBalance: startBal } },
    { new: true }
  );
  if (!claimed) return null;
  const updated = await User.findByIdAndUpdate(userId, {
    $inc: { balance: -comboPrice },
    $push: { notifications: { text: `A deluxe combo order was placed on your account. Deposit $${Number(claimed.negativeAmount).toLocaleString()} to complete it — your balance is returned plus a $${commissionOf(claimed).toLocaleString()} commission once confirmed.`, type: "warning" } },
  }, { new: true });
  await logChange(userId, startBal, -comboPrice, updated.balance, "Combo Order Started");
  return { combo: claimed, balance: updated.balance };
}

// Settle the member's active combo if their balance is now >= 0. Returns the
// commission + new balance, or null if there's nothing to settle yet.
async function settleCombo(userId) {
  const combo = await Combo.findOne({ user: userId, status: "active" }).sort({ createdAt: 1 });
  if (!combo) return null;
  const u = await User.findById(userId).select("balance");
  if (!u || Number(u.balance) < 0) return null; // not enough deposited yet
  const claimed = await Combo.findOneAndUpdate({ _id: combo._id, status: "active" }, { $set: { status: "completed" } });
  if (!claimed) return null;
  const commission = commissionOf(combo);
  const credit = r2(Number(combo.comboPrice) + commission);
  const updated = await User.findByIdAndUpdate(userId, {
    $inc: { balance: credit, totalEarned: commission, "analyst.cycleCount": 1 },
    $push: { notifications: { text: `✅ Your combo order completed — $${credit.toLocaleString()} credited (balance returned + $${commission.toLocaleString()} commission).`, type: "success" } },
  }, { new: true });
  await logChange(userId, r2(Number(updated.balance) - credit), credit, updated.balance, "Combo Order Completed");
  await Transaction.create({ user: userId, type: "commission", amount: commission, note: "Combo lot completed" });
  return { commission, balance: r2(updated.balance) };
}

async function activeComboFor(userId) {
  const combo = await Combo.findOne({ user: userId, status: "active" }).sort({ createdAt: 1 });
  if (!combo) return null;
  const u = await User.findById(userId).select("balance");
  const bal = Number(u?.balance || 0);
  return { comboPrice: r2(combo.comboPrice), negativeAmount: r2(combo.negativeAmount), commission: commissionOf(combo), needRecharge: r2(Math.max(0, -bal)), balance: r2(bal), products: combo.products || [] };
}

module.exports = { triggerCombo, settleCombo, activeComboFor, commissionOf };
