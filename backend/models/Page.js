const mongoose = require("mongoose");

// Admin-editable content page (CMS), served to the public by slug. Lets staff
// edit legal / info pages without a deploy. Ported from Cushman.
const Schema = new mongoose.Schema({
  title:   { type: String, required: true },
  slug:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  content: { type: String, default: "" },   // HTML
  active:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Page || mongoose.model("Page", Schema);
