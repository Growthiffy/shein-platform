// Level ladder per spec. Normal commission, latest (newer-collection) commission,
// and the per-transaction withdrawal cap for the tier (null = unlimited).
module.exports = [
  { key: "beginner", name: "Beginner", minBalance: 0,    dailySalary: 230, normalPct: 1.2,  latestPct: 23, withdrawLimit: 1300 },
  { key: "silver",   name: "Silver",   minBalance: 1000, dailySalary: 500, normalPct: 2,    latestPct: 28, withdrawLimit: 4000 },
  { key: "gold",     name: "Gold",     minBalance: 2000, dailySalary: 750, normalPct: 4,    latestPct: 35, withdrawLimit: null },
];

module.exports.INVEST_TIERS = [
  { level: 1, name: "Basic",     weeklyPct: 1,  min: 1000 },
  { level: 2, name: "Bronze",    weeklyPct: 3,  min: 2500 },
  { level: 3, name: "Silver",    weeklyPct: 5,  min: 3500 },
  { level: 4, name: "Gold",      weeklyPct: 10, min: 5000 },
  { level: 5, name: "Platinum",  weeklyPct: 20, min: 7000 },
  { level: 6, name: "Diamond",   weeklyPct: 25, min: 10000 },
  { level: 7, name: "Royal VIP", weeklyPct: 30, min: 25000 },
];

module.exports.SIGNUP_REWARD = 20;
module.exports.REFERRAL_BONUS = 10; // credited to referrer when their invitee verifies
module.exports.PRODUCTS_PER_CYCLE = 27;
