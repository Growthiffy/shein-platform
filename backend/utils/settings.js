const Setting = require("../models/Setting");

// Fallbacks used when a row has not been seeded/created yet, so old databases
// keep working. Admin writes override these via the Setting collection.
const DEFAULTS = {
  minWithdrawalUsd: 50,
  investLockWeeks: 4,
  personaChatIntervalMin: 15,

  // Activity feed + public stats
  activityFeedEnabled: true,
  platformMemberCount: 12847,

  // Persona active hours (server timezone, 0-23)
  personaActiveHoursStart: 7,
  personaActiveHoursEnd: 23,

  // Company identity (footer + legal pages)
  companyName: "Shein Global Ltd",
  companyRegistration: "SG-2021-48271",
  socialTelegram: "",
  socialTwitter: "",
  socialInstagram: "",
  supportEmail: "support@shein-global.com",
  supportPhone: "+44 20 7946 0958",

  // Financial flow
  withdrawalFeeUsd: 2.5,
  withdrawalProcessingHours: 72,
  depositDailyLimit: 50000,
  depositMonthlyLimit: 200000,

  // KYC
  verificationWithdrawalThreshold: 500,

  // Support auto-reply
  supportAutoReplyEnabled: true,
  supportAutoReplyText:
    "Thank you for contacting Shein Support. Your ticket #{ticketNumber} has been created. A support specialist will respond within 24 hours. For urgent matters, email support@shein-global.com.",
};

async function getSetting(key) {
  const row = await Setting.findOne({ key });
  return row ? row.value : DEFAULTS[key];
}

async function getSettings(keys = Object.keys(DEFAULTS)) {
  const rows = await Setting.find({ key: { $in: keys } });
  const map = {};
  for (const k of keys) map[k] = DEFAULTS[k];
  for (const r of rows) map[r.key] = r.value;
  return map;
}

module.exports = { getSetting, getSettings, DEFAULTS };
