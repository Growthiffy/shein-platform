const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  brand:        { type: String, required: true },     // e.g. "Vogue"
  name:         { type: String, required: true },     // e.g. "Tie"
  image:        { type: String },
  originalPrice:{ type: Number, required: true },     // sticker
  isLatest:     { type: Boolean, default: false },    // latest collection -> higher commission
  active:       { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
