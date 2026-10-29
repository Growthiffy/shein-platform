const mongoose = require("mongoose");

// AI community persona. Posts automated chatter into the daily/invest groups.
// group: which room(s) it posts in. canReply: whether its messages invite
// replies. active: toggle to stop it posting without deleting it.
const Schema = new mongoose.Schema({
  name:      { type: String, required: true },
  title:     { type: String },
  avatar:    { type: String },
  group:     { type: String, enum: ["daily", "invest", "both"], default: "both" },
  canReply:  { type: Boolean, default: false },
  active:    { type: Boolean, default: true },
  templates: [{ type: String }], // optional per-persona lines; falls back to shared pool
}, { timestamps: true });

module.exports = mongoose.model("Persona", Schema);
