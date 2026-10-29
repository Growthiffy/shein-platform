// One-off: assign accountNumber + referralCode + creditScore to existing users
// that predate those fields. Idempotent — skips anyone already filled.
require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Counter = require("../models/Counter");

async function makeReferralCode() {
  for (let i = 0; i < 6; i++) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    if (!(await User.findOne({ referralCode: code }))) return code;
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

async function main() {
  await connectDB();
  const users = await User.find({ $or: [{ accountNumber: { $exists: false } }, { referralCode: { $exists: false } }, { referralCode: null }] });
  let n = 0;
  for (const u of users) {
    if (u.accountNumber == null) u.accountNumber = await Counter.next("accountNumber");
    if (!u.referralCode) u.referralCode = await makeReferralCode();
    if (u.creditScore == null) u.creditScore = 100;
    await u.save();
    n++;
  }
  console.log("backfilled users:", n);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
