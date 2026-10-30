const mongoose = require("mongoose");

// Public-site submissions: contact form + newsletter subscribe. Ported from Cushman.
const Schema = new mongoose.Schema({
  kind:    { type: String, enum: ["contact", "newsletter"], default: "contact", index: true },
  name:    { type: String, default: "" },
  email:   { type: String, default: "" },
  message: { type: String, default: "" },
  ip:      { type: String, default: "" },
  handled: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.ContactMessage || mongoose.model("ContactMessage", Schema);
