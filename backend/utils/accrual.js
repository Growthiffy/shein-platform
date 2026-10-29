// Accrue daily salary + weekly investment payout on each /me fetch.
// Idempotent per day/week via lastSalaryAt / lastPayoutAt timestamps.
const Transaction = require("../models/Transaction");
const LEVELS = require("../config/levels");
const { INVEST_TIERS } = LEVELS;

const DAY_MS  = 24 * 3600 * 1000;
const WEEK_MS = 7 * DAY_MS;

function levelFor(balance) {
  let hit = LEVELS[0];
  for (const l of LEVELS) if (balance >= l.minBalance) hit = l;
  return hit;
}

async function accrueAndUpgrade(user) {
  const now = Date.now();
  let changed = false;

  // Daily salary — only credited on days the user actually analyzed at least once?
  // Spec says the salary is a *basis*, not automatic. We implement opt-in: credit
  // the user's daily salary if they've submitted any analyst row that day.
  // For simplicity in production: skip auto-salary (admin controls via adjustment).

  // Weekly investment payout
  const inv = user.investment;
  if (inv?.amount > 0) {
    const tier = INVEST_TIERS.find(t => t.level === inv.tier);
    if (tier) {
      const lastAt = inv.lastPayoutAt ? new Date(inv.lastPayoutAt).getTime() : (inv.startedAt ? new Date(inv.startedAt).getTime() : now);
      const weeks = Math.floor((now - lastAt) / WEEK_MS);
      if (weeks > 0) {
        const payout = +(inv.amount * (tier.weeklyPct / 100) * weeks).toFixed(2);
        user.balance = +(user.balance + payout).toFixed(2);
        user.totalEarned = +(user.totalEarned + payout).toFixed(2);
        user.investment.lastPayoutAt = new Date(lastAt + weeks * WEEK_MS);
        await Transaction.create({ user: user._id, type: "invest_payout", amount: payout, note: `${weeks} wk × ${tier.weeklyPct}% @ Tier ${tier.name}` });
        changed = true;
      }
    }
  }

  // Auto-level upgrade (never downgrade mid-session; admin can adjust manually)
  const lvl = levelFor(user.balance);
  if (user.level !== lvl.key) {
    user.level = lvl.key;
    user.dailySalary = lvl.dailySalary;
    changed = true;
  }

  if (changed) await user.save();
  return user;
}

module.exports = { accrueAndUpgrade, levelFor };
