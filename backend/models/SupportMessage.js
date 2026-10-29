const mongoose = require("mongoose");

// Support thread message.
// from: "user" (member) | "staff" (admin) | "system" (status note e.g. ended/reopened).
// closed: true once the thread was ended; a new user/staff message is closed:false,
//         which reopens the thread. A thread's current status = its latest message's
//         `closed` flag.
const Schema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  from:       { type: String, enum: ["user", "staff", "system"], default: "user" },
  text:       { type: String, required: true },
  closed:     { type: Boolean, default: false, index: true },
  readByStaff:{ type: Boolean, default: false },
  readByUser: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.SupportMessage || mongoose.model("SupportMessage", Schema);
