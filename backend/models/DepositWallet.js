const mongoose = require("mongoose");

// Company-side deposit addresses (shown to users on Deposit screen).
const Schema = new mongoose.Schema({
  chain:   { type: String, required: true },   // e.g. TRC20, BEP20, ERC20
  address: { type: String, required: true },
  label:   { type: String },
  active:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("DepositWallet", Schema);
