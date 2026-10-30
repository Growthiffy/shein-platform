// Append a row to the balance-change audit ledger (AccountChange). Best-effort:
// never let an audit-write failure break the money operation that triggered it.
const AccountChange = require("../models/AccountChange");
const r2 = n => Math.round(Number(n || 0) * 100) / 100;

async function logChange(userId, oldBalance, amount, newBalance, type) {
  try {
    await AccountChange.create({ user: userId, oldBalance: r2(oldBalance), amount: r2(amount), newBalance: r2(newBalance), type: type || "Adjustment" });
  } catch {}
}

module.exports = { logChange };
