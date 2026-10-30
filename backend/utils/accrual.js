// Accrue daily salary + weekly investment payout on each /me fetch.
// Idempotent per day/week via lastSalaryAt / lastPayoutAt timestamps.
const Transaction = require("../models/Transaction");
const LEVELS = require("../config/levels");
const { INVEST_TIERS } = LEVELS;
const { sendSalaryCredited, sendInvestPayout } = require("./mailer");

const DAY_MS  = 24 * 3600 * 1000;
const WEEK_MS = 7 * DAY_MS;

function levelFor(balance) {
  let hit = LEVELS[0];
  for (const l of LEVELS) if (balance >= l.minBalance) hit = l;
  return hit;
}

async function accrueAndUpgrade(user) {
  // Frozen (in-deficit) accounts earn nothing — no salary, no investment payout,
  // no level change — until an admin clears the penalty.
  if (user.frozen?.active) return user;
  const now = Date.now();
  let changed = false;

  // Daily salary accrual. Credited per whole elapsed day since lastSalaryAt.
  // Guards: email-verified, positive balance at or above the current level's
  // minBalance (so a $0 user earns nothing). Clamp elapsed days to [0, 7] so an
  // inactive user cannot farm a large backlog in one hit.
  {
    const salLvl = levelFor(user.balance);
    const lastSal = user.lastSalaryAt ? new Date(user.lastSalaryAt).getTime() : null;
    if (lastSal === null) {
      // First-ever accrual: set the clock, credit nothing.
      user.lastSalaryAt = new Date(now);
      changed = true;
    } else {
      const rawDays = Math.floor((now - lastSal) / DAY_MS);
      const days = Math.min(Math.max(rawDays, 0), 7);
      if (days > 0) {
        if (user.emailVerified && user.balance > 0 && user.balance >= salLvl.minBalance) {
          const payout = +(days * salLvl.dailySalary).toFixed(2);
          user.balance = +(user.balance + payout).toFixed(2);
          user.totalEarned = +(user.totalEarned + payout).toFixed(2);
          await Transaction.create({ user: user._id, type: "salary", amount: payout, note: `${days}d × $${salLvl.dailySalary} @ ${salLvl.name}` });
          sendSalaryCredited(user, payout).catch(() => {});
        }
        // Advance the clock whether or not we credited, forfeiting any excess
        // beyond the 7-day clamp so a long gap cannot be farmed across calls.
        user.lastSalaryAt = rawDays > 7 ? new Date(now) : new Date(lastSal + days * DAY_MS);
        changed = true;
      }
    }
  }

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
        sendInvestPayout(user, payout).catch(() => {});
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
