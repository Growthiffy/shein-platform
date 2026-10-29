const mongoose = require("mongoose");

// Generic key/value settings bag. Keep it broad so future flags (lock period,
// feature toggles, chat cadence) all live here without new collections.
const Schema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model("Setting", Schema);
