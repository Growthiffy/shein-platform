const mongoose = require("mongoose");

// Tracks when a mentor-operator last read a given mentee's 1:1 room, so the
// dashboard can show WhatsApp-style unread counts. One row per (mentor, mentee).
const Schema = new mongoose.Schema({
  mentor:   { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", required: true, index: true },
  mentee:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  lastReadAt: { type: Date, default: null },
}, { timestamps: true });

Schema.index({ mentor: 1, mentee: 1 }, { unique: true });

module.exports = mongoose.models.MentorRead || mongoose.model("MentorRead", Schema);
