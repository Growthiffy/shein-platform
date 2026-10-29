const mongoose = require("mongoose");

// Support thread message. from = "user" (member) | "staff" (admin reply).
const Schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  from: { type: String, enum: ["user", "staff"], default: "user" },
  text: { type: String, required: true },
  readByStaff: { type: Boolean, default: false },
  readByUser:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("SupportMessage", Schema);
