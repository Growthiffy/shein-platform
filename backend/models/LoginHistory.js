const mongoose = require("mongoose");

// One row per successful login. Powers the customer Security page and the
// admin Login History view.
const Schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ip:   { type: String },
  userAgent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("LoginHistory", Schema);
