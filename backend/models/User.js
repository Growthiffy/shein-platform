const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  username:     { type: String, unique: true, sparse: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  verifyCode:   { type: String },
  verifyExpires:{ type: Date },

  balance:      { type: Number, default: 0 },     // live wallet balance
  rewardCredit: { type: Number, default: 20 },    // signup reward (non-withdrawable until criteria met)
  level:        { type: String, default: "beginner" },
  dailySalary:  { type: Number, default: 230 },
  totalEarned:  { type: Number, default: 0 },

  mentor:       { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", default: null },

  investment: {
    tier:        { type: Number, default: 0 },      // 0 = none
    amount:      { type: Number, default: 0 },
    startedAt:   { type: Date },
    lockUntil:   { type: Date },
    lastPayoutAt:{ type: Date },
  },

  payoutWallets: [{ chain: String, address: String, label: String }],

  analyst: {
    cycleCount:   { type: Number, default: 0 },     // products submitted in current cycle (0-27)
    pendingProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    pendingAdjustedProfitPct: { type: Number, default: null }, // admin-set profit adjustment for next product
  },

  // RBAC. `role` is the source of truth; `isAdmin` kept in sync for backward compat.
  role:    { type: String, enum: ["customer", "admin"], default: "customer" },
  isAdmin: { type: Boolean, default: false },
}, { timestamps: true });

// Keep role <-> isAdmin consistent regardless of which field a writer sets.
UserSchema.pre("save", function (next) {
  if (this.isModified("role")) this.isAdmin = this.role === "admin";
  else if (this.isModified("isAdmin")) this.role = this.isAdmin ? "admin" : "customer";
  next();
});

module.exports = mongoose.model("User", UserSchema);
