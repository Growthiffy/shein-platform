// Raise an admin-facing notification for a member action. Best-effort: never let
// a notification failure break the action that triggered it. Per-type muting is
// controlled by the `muteNotif_<type>` setting (cached briefly).
const AdminNotification = require("../models/AdminNotification");
const { getSetting } = require("./settings");

// All notifiable action types (used by the dashboard mute UI too).
const TYPES = ["deposit", "withdrawal", "support", "community", "analyst", "combo", "verification", "signup", "login", "invest"];

const muteCache = new Map(); // type -> { muted, at }
async function isMuted(type) {
  const c = muteCache.get(type);
  if (c && Date.now() - c.at < 5000) return c.muted;
  let v = false;
  try { const s = await getSetting(`muteNotif_${type}`); v = s === true || s === "true"; } catch {}
  muteCache.set(type, { muted: v, at: Date.now() });
  return v;
}

async function notifyAdmins(type, { title, body, user, userName, meta } = {}) {
  try {
    if (await isMuted(type)) return;
    await AdminNotification.create({ type, title, body: body || "", user: user || null, userName: userName || "", meta: meta || {} });
  } catch {}
}

module.exports = { notifyAdmins, TYPES };
