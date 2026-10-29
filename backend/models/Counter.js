const mongoose = require("mongoose");

// Atomic sequence generator (e.g. member account numbers).
const Schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

Schema.statics.next = async function (key, start = 10000) {
  const row = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $setOnInsert: { key } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  // First-ever increment yields 1; offset so numbers start at `start`.
  return start + row.seq;
};

module.exports = mongoose.model("Counter", Schema);
