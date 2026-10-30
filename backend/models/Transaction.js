const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type:    { type: String, enum: ["deposit", "withdrawal", "commission", "salary", "invest_payout", "invest_lock", "invest_release", "reward", "adjustment"], required: true },
  amount:  { type: Number, required: true },
  status:  { type: String, enum: ["pending", "approved", "rejected", "complete"], default: "complete" },
  chain:   { type: String },
  address: { type: String },
  txHash:  { type: String },
  note:    { type: String },
  slipUrl: { type: String }, // optional receipt image
  meta:    { type: Object },

  // Richer deposit/withdrawal lifecycle (presentation on top of `status`).
  processingStage: { type: String, enum: ["submitted", "under_review", "processing", "completed", "requires_verification", "rejected"], default: "submitted" },
  stageHistory: [{
    stage: { type: String },
    at:    { type: Date, default: Date.now },
    note:  { type: String },
  }],
  estimatedCompletionAt: { type: Date },
  networkFee: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Transaction", Schema);
