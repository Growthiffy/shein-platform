const mongoose = require("mongoose");

// Community + mentor chat. authorType = "user" | "ai" | "mentor"
const Schema = new mongoose.Schema({
  group:       { type: String, required: true, index: true }, // "daily" | "invest" | mentor:<id>
  user:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorType:  { type: String, enum: ["user", "ai", "mentor"], default: "user" },
  authorName:  { type: String },
  authorAvatar:{ type: String },
  text:        { type: String, required: true },
  canReply:    { type: Boolean, default: true }, // AI persona that only talks, never replies
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", Schema);
