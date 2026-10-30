const mongoose = require("mongoose");

// Admin-facing activity notification. Raised whenever a member does something an
// operator may want to see (deposit, withdrawal, support message, community post,
// analyst trade, combo, verification, signup, login, investment). Each type can be
// muted via the `muteNotif_<type>` setting.
const Schema = new mongoose.Schema({
  type:    { type: String, required: true, index: true },   // deposit | withdrawal | support | community | analyst | combo | verification | signup | login | invest
  title:   { type: String, required: true },
  body:    { type: String, default: "" },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  userName:{ type: String },
  meta:    { type: Object, default: {} },
  read:    { type: Boolean, default: false, index: true },
}, { timestamps: true });

Schema.index({ createdAt: -1 });

module.exports = mongoose.models.AdminNotification || mongoose.model("AdminNotification", Schema);
