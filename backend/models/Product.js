const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  brand:        { type: String, required: true },     // e.g. "Vogue"
  name:         { type: String, required: true },     // e.g. "Tie"
  image:        { type: String },
  originalPrice:{ type: Number, required: true },     // sticker
  isLatest:     { type: Boolean, default: false },    // latest collection -> higher commission
  active:       { type: Boolean, default: true },
  category:     { type: String, enum: ["fashion", "electronics", "home", "beauty", "accessories", "sports"], default: "fashion" },
  marketBrief:  { type: String, default: "" },        // short analyst-facing market summary
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
