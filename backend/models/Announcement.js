const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  title:       { type: String, required: true },
  body:        { type: String, default: "" },
  type:        { type: String, enum: ["news", "update", "maintenance", "promotion"], default: "news" },
  pinned:      { type: Boolean, default: false },
  active:      { type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.Announcement || mongoose.model("Announcement", Schema);
