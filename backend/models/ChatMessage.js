const mongoose = require("mongoose");

// Community + mentor chat. authorType = "user" | "staff" | "persona" | "mentor"
// "staff" = official Shein announcement account posted by an admin.
// "persona" = automated AI community member (treated like staff in the UI).
const Schema = new mongoose.Schema({
  group:       { type: String, required: true, index: true }, // "daily" | "invest" | mentor:<id>
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorType:  { type: String, enum: ["user", "staff", "ai", "persona", "mentor"], default: "user" },
  authorName:  { type: String },
  authorAvatar:{ type: String },
  text:        { type: String, required: true },
  canReply:    { type: Boolean, default: true }, // false = announcement-only account (one-way broadcasts)
  // Reply-to: a snapshot of the quoted message (so it survives even if the
  // original is deleted). mentions: @names referenced in the text.
  replyTo:     {
    id:         { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" },
    authorName: { type: String },
    text:       { type: String },
  },
  mentions:    [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", Schema);
