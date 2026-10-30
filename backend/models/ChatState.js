const mongoose = require("mongoose");

// Per-group state for the automated community chatter engine. Drives realistic
// pacing: an active conversation script with assigned persona speakers, the next
// scheduled emit time, the current mood, and a snapshot of the last message (so
// a following line can reply to / mention it).
const Schema = new mongoose.Schema({
  group:      { type: String, required: true, unique: true, index: true },
  nextAt:     { type: Date, default: Date.now },
  // Short-lived claim so only one request backfills a gap of history at a time.
  backfillAt: { type: Date, default: null },
  scriptId:   { type: Number, default: -1 },   // -1 = no active script
  scriptStep: { type: Number, default: 0 },
  mood:       { type: String, default: "normal" },
  speakers:   [{ name: String, avatar: String }],
  // Two-phase "typing then post": messages queued while a typing indicator shows.
  pending:    { type: mongoose.Schema.Types.Mixed, default: null },
  lastMsg:    {
    id:         { type: mongoose.Schema.Types.ObjectId },
    authorName: { type: String },
    text:       { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.models.ChatState || mongoose.model("ChatState", Schema);
