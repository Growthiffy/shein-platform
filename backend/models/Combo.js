const mongoose = require("mongoose");

// Admin-planted "combo lot": a high-value analyst task injected at a specific
// position (comboAt = the member's analysis number). When the member reaches it,
// the combo is TRIGGERED — their balance is driven to exactly -negativeAmount
// (comboPrice = balance-at-trigger + negativeAmount is deducted). The member must
// top the shortfall back to >= 0 (deposit), then complete the combo to get the
// full comboPrice back PLUS a large commission. Ported from the Cushman model.
const Schema = new mongoose.Schema({
  user:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  comboAt:        { type: Number, required: true },    // triggers when cycleCount+1 reaches this
  negativeAmount: { type: Number, default: 0 },        // how far below zero the balance is driven
  commission:     { type: Number, default: 20 },       // % of the commission base
  comboPrice:     { type: Number, default: 0 },         // amount deducted at trigger (set live)
  startBalance:   { type: Number, default: 0 },         // balance snapshot at trigger
  status:         { type: String, enum: ["pending", "active", "completed"], default: "pending" },
  products: [{
    name:  { type: String, required: true },
    value: { type: Number, default: 0 },
    image: { type: String },
  }],
}, { timestamps: true });

module.exports = mongoose.models.Combo || mongoose.model("Combo", Schema);
