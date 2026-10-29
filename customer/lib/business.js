export const LEVELS = [
  { key: "beginner", name: "Beginner", minBalance: 0,    dailySalary: 230, normalPct: 1.2,  latestPct: 23 },
  { key: "silver",   name: "Silver",   minBalance: 1000, dailySalary: 500, normalPct: 2,    latestPct: 28 },
  { key: "gold",     name: "Gold",     minBalance: 2000, dailySalary: 750, normalPct: 4,    latestPct: 35 },
];

export const INVEST_TIERS = [
  { level: 1, name: "Basic",     weeklyPct: 1,  min: 1000 },
  { level: 2, name: "Bronze",    weeklyPct: 3,  min: 2500 },
  { level: 3, name: "Silver",    weeklyPct: 5,  min: 3500 },
  { level: 4, name: "Gold",      weeklyPct: 10, min: 5000 },
  { level: 5, name: "Platinum",  weeklyPct: 20, min: 7000 },
  { level: 6, name: "Diamond",   weeklyPct: 25, min: 10000 },
  { level: 7, name: "Royal VIP", weeklyPct: 30, min: 25000 },
];

export const SIGNUP_REWARD = 20;
export const PRODUCTS_PER_CYCLE = 27;

export function levelFor(balance) {
  let hit = LEVELS[0];
  for (const l of LEVELS) if (balance >= l.minBalance) hit = l;
  return hit;
}

export function quoteFor(user, product) {
  const lvl = levelFor(user.balance);
  const basePct = product.is_latest ? lvl.latestPct : lvl.normalPct;
  const forced = user.analyst_forced_pct;
  const profitPct = (forced !== null && forced !== undefined) ? forced : basePct;
  const salePrice = product.original_price;
  const profitAmount = +(salePrice * profitPct / 100).toFixed(2);
  const buyingRate = +(salePrice - profitAmount).toFixed(2);
  return { profitPct, profitAmount, salePrice, buyingRate, level: lvl };
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

export function pendingAccrual(user) {
  // returns { payout, weeks, tier } for weekly invest and new level
  const now = Date.now();
  let payout = 0, weeks = 0, tier = null;
  if (user.investment_amount > 0) {
    tier = INVEST_TIERS.find(t => t.level === user.investment_tier) || null;
    if (tier) {
      const last = user.investment_last_payout_at || user.investment_started_at || now;
      weeks = Math.floor((now - last) / WEEK_MS);
      if (weeks > 0) payout = +(user.investment_amount * (tier.weeklyPct / 100) * weeks).toFixed(2);
    }
  }
  const newBalance = +(user.balance + payout).toFixed(2);
  const lvl = levelFor(newBalance);
  return { payout, weeks, tier, newLevel: lvl, newBalance, lastPayoutAt: user.investment_last_payout_at && weeks > 0 ? (user.investment_last_payout_at + weeks * WEEK_MS) : user.investment_last_payout_at };
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    balance: u.balance,
    rewardCredit: u.reward_credit,
    level: u.level,
    dailySalary: u.daily_salary,
    totalEarned: u.total_earned,
    emailVerified: !!u.email_verified,
    mentor: u.mentor_id,
    isAdmin: !!u.is_admin,
    investment: {
      tier: u.investment_tier,
      amount: u.investment_amount,
      startedAt: u.investment_started_at,
      lockUntil: u.investment_lock_until,
      lastPayoutAt: u.investment_last_payout_at,
    },
    analyst: { cycleCount: u.analyst_cycle_count || 0 },
  };
}
