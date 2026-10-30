const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product:     { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  cycleIndex:  { type: Number, required: true },   // 1..27
  buyingRate:  { type: Number, required: true },
  salePrice:   { type: Number, required: true },
  profitPct:   { type: Number, required: true },
  profitAmount:{ type: Number, required: true },
  isLatest:    { type: Boolean, default: false },
  comment:     { type: String, required: true, trim: true },
  // Structured ratings (1-5) + recommended action make the analysis feel real.
  demandRating:  { type: Number, min: 1, max: 5 },
  qualityRating: { type: Number, min: 1, max: 5 },
  priceRating:   { type: Number, min: 1, max: 5 },
  recommendation:{ type: String, enum: ["stock_more", "maintain", "reduce", "discontinue"] },
  qualityScore:  { type: Number },   // cosmetic AI score 72-96, not used for logic
  status:      { type: String, enum: ["pending", "complete"], default: "complete" },
}, { timestamps: true });

module.exports = mongoose.model("AnalystSubmission", Schema);
