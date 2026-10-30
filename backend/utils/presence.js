// Helpers over the Presence collection: is a real human (admin/mentor) live in a
// group right now, and who is actively typing. The persona engine and the mentor
// auto-reply both consult `humanPresent` and stay silent when it is true, so a
// real person is never talked over.
const Presence = require("../models/Presence");

// True if any admin/mentor heartbeat for this group is still live.
async function humanPresent(group) {
  const now = new Date();
  const row = await Presence.findOne({ group, expiresAt: { $gt: now } }).select("_id typingUntil");
  return !!row;
}

// Names of humans actively typing in a group (for the members' typing indicator).
async function typingNames(group) {
  const now = new Date();
  const rows = await Presence.find({ group, typingUntil: { $gt: now } }).select("name").limit(3);
  return rows.map(r => r.name).filter(Boolean);
}

// Upsert a heartbeat. presenceMs keeps the row alive; typing extends typingUntil.
async function heartbeat({ group, user, name, kind, typing }) {
  const now = Date.now();
  const expiresAt = new Date(now + 45 * 1000);        // row lives ~45s past last beat
  const set = { name, kind, expiresAt };
  if (typing) set.typingUntil = new Date(now + 8 * 1000);
  await Presence.updateOne({ group, user }, { $set: set }, { upsert: true });
}

async function clear({ group, user }) {
  await Presence.deleteOne({ group, user }).catch(() => {});
}

module.exports = { humanPresent, typingNames, heartbeat, clear };
