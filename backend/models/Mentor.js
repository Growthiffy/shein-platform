const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  name:   { type: String, required: true },
  title:  { type: String },
  bio:    { type: String },
  avatar: { type: String },
  active: { type: Boolean, default: true },
  // Admin User who controls this mentor. When set, that operator replies to
  // mentees as a real human from the dashboard "My Juniors" section, and their
  // live presence mutes the mentor auto-reply. Null = auto-reply mentor only.
  owner:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  // Presence is computed on read (see utils/mentorStatus); these persist the
  // last computed values for reference.
  status:     { type: String, enum: ["online", "away", "offline"], default: "offline" },
  lastSeenAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Mentor", Schema);
