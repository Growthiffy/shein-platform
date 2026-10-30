const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email:        { type: String, unique: true, sparse: true, lowercase: true, trim: true },
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
  lastSalaryAt: { type: Date },                   // last daily-salary accrual timestamp

  // Profile
  accountNumber: { type: Number, index: true },   // sequential member number (assigned on verify)
  phone:        { type: String },
  avatar:       { type: String },                 // avatar image URL
  creditScore:  { type: Number, default: 100 },   // trust/credibility score (admin-adjustable)

  // Referral
  referralCode: { type: String, index: true },    // this user's own invite code
  referredBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  // In-app notifications (newest last)
  notifications: [{
    text: { type: String, required: true },
    type: { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],

  mentor:       { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", default: null },

  investment: {
    tier:        { type: Number, default: 0 },      // 0 = none
    amount:      { type: Number, default: 0 },
    startedAt:   { type: Date },
    lockUntil:   { type: Date },
    lastPayoutAt:{ type: Date },
  },

  payoutWallets: [{ chain: String, address: String, label: String, addedAt: Date, active: { type: Boolean, default: true } }],

  // KYC / verification. All optional with safe defaults so old docs keep working.
  verification: {
    level:      { type: String, enum: ["none", "basic", "standard", "pending_premium", "premium"], default: "none" },
    fullName:   { type: String },
    phone:      { type: String },
    country:    { type: String },
    idType:     { type: String },   // passport | national_id | drivers_license
    idNumber:   { type: String },
    idImageUrl: { type: String },   // stored, never actually verified
    submittedAt:{ type: Date },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
  },

  // Security
  antiPhishCode: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String },
  loginAlerts: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },

  // Onboarding: latch so the "all done" notification fires only once.
  onboardingComplete: { type: Boolean, default: false },

  analyst: {
    cycleCount:   { type: Number, default: 0 },     // products submitted in current cycle (0-27)
    pendingProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    pendingProfitPct: { type: Number, default: null },         // snapshot of profit % when product first shown (price stability)
    pendingAdjustedProfitPct: { type: Number, default: null }, // admin-set profit adjustment for next product
    lastSubmitAt: { type: Date, default: null },               // enforces the between-product cooldown
  },

  // Community access gates (admin-controlled). Default all true so existing
  // users keep full access.
  communityAccess: {
    daily:       { type: Boolean, default: true },
    invest:      { type: Boolean, default: true },
    mentorRooms: { type: Boolean, default: true },
  },

  // RBAC. `role` is the source of truth; `isAdmin` kept in sync for backward compat.
  role:    { type: String, enum: ["customer", "admin"], default: "customer" },
  isAdmin: { type: Boolean, default: false },
  // Fine-grained admin permissions. Empty/undefined OR containing "*" = full
  // access (owner). A non-empty list without "*" restricts the operator to the
  // listed areas. Ignored for non-admins.
  permissions: [{ type: String }],
}, { timestamps: true });

// Keep role <-> isAdmin consistent regardless of which field a writer sets.
UserSchema.pre("save", function (next) {
  if (this.isModified("role")) this.isAdmin = this.role === "admin";
  else if (this.isModified("isAdmin")) this.role = this.isAdmin ? "admin" : "customer";
  next();
});

module.exports = mongoose.model("User", UserSchema);
