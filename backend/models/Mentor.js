const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  name:   { type: String, required: true },
  title:  { type: String },
  bio:    { type: String },
  avatar: { type: String },
  active: { type: Boolean, default: true },
  // Presence is computed on read (see utils/mentorStatus); these persist the
  // last computed values for reference.
  status:     { type: String, enum: ["online", "away", "offline"], default: "offline" },
  lastSeenAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Mentor", Schema);
