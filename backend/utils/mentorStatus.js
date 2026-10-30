// Computed mentor presence. Offline outside active hours; inside hours it cycles
// online (~60%) / away (~40%) on a ~10-minute bucket, seeded per mentor so it's
// stable within a bucket but varies between mentors and over time.
const { getSettings } = require("./settings");

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}

async function statusFor(mentorId) {
  const s = await getSettings(["personaActiveHoursStart", "personaActiveHoursEnd"]);
  const start = Number(s.personaActiveHoursStart), end = Number(s.personaActiveHoursEnd);
  const now = new Date();
  const h = now.getHours();
  const active = start <= end ? (h >= start && h < end) : (h >= start || h < end);

  if (!active) {
    // Offline: last seen a deterministic 1-6h ago.
    const hrs = 1 + (hashStr(String(mentorId) + now.toDateString()) % 6);
    return { status: "offline", lastSeenAt: new Date(now.getTime() - hrs * 3600 * 1000) };
  }
  const bucket = Math.floor(now.getTime() / (10 * 60 * 1000));
  const v = hashStr(String(mentorId) + ":" + bucket) % 100;
  return { status: v < 60 ? "online" : "away", lastSeenAt: now };
}

module.exports = { statusFor };
