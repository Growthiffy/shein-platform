const Setting = require("../models/Setting");

// Fallbacks used when a row has not been seeded/created yet, so old databases
// keep working. Admin writes override these via the Setting collection.
const DEFAULTS = {
  minWithdrawalUsd: 50,
  investLockWeeks: 4,
  personaChatIntervalMin: 15,
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
