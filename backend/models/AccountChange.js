const mongoose = require("mongoose");

// Audit ledger of every balance change (the admin "Account Changes" screen).
// Records the signed amount plus the before/after balance and a human label, so
// staff can see exactly how a member's balance moved and why. Ported from Cushman.
const Schema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  oldBalance: { type: Number, required: true },
  amount:     { type: Number, required: true },   // signed (+credit / -debit)
  newBalance: { type: Number, required: true },
  type:       { type: String, default: "Adjustment" },
}, { timestamps: true });

module.exports = mongoose.models.AccountChange || mongoose.model("AccountChange", Schema);
