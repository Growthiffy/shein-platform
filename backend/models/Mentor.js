const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  name:   { type: String, required: true },
  title:  { type: String },
  bio:    { type: String },
  avatar: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Mentor", Schema);
