const mongoose = require("mongoose");

// Live presence of a REAL human (admin / mentor) in a chat group. Written by a
// heartbeat while an operator has a room open in the dashboard. Used to mute the
// automated personas and the mentor auto-reply so they never talk over a real
// person, and to show members a genuine "typing…" / "online" indicator.
//
// One row per (group, user). `expiresAt` is a TTL field: Mongo deletes the row
// shortly after the heartbeat stops, so presence self-clears if a tab is closed.
// `typingUntil` is a short separate window set when the operator is typing.
const Schema = new mongoose.Schema({
  group:       { type: String, required: true, index: true },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:        { type: String },
  kind:        { type: String, enum: ["admin", "mentor"], default: "admin" },
  typingUntil: { type: Date, default: null },
  expiresAt:   { type: Date, required: true },
}, { timestamps: true });

Schema.index({ group: 1, user: 1 }, { unique: true });
// TTL: remove the row the moment expiresAt passes (heartbeat lapsed).
Schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.Presence || mongoose.model("Presence", Schema);
