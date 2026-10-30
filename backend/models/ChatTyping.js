const mongoose = require("mongoose");

// Short-lived "X is typing…" markers for the community chat. A TTL index wipes
// each row ~10s after creation so stale indicators never linger even if a
// process dies mid-write. The GET endpoint filters on expiresAt for display.
const Schema = new mongoose.Schema({
  group:       { type: String, required: true, index: true },
  personaName: { type: String, required: true },
  expiresAt:   { type: Date, required: true },
  createdAt:   { type: Date, default: Date.now, expires: 10 }, // TTL: delete after 10s
});

module.exports = mongoose.models.ChatTyping || mongoose.model("ChatTyping", Schema);
