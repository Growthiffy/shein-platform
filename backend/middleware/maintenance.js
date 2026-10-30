// When maintenance mode is on, member-facing routes return 503. Admins bypass it
// (so they can keep working and toggle it off). The setting is cached briefly to
// avoid a DB read on every request.
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getSetting } = require("../utils/settings");

let cache = { on: false, msg: "", at: 0 };

async function maintenance(req, res, next) {
  try {
    const now = Date.now();
    if (now - cache.at > 5000) {
      const m = await getSetting("maintenanceMode");
      cache = { on: m === true || m === "true", msg: await getSetting("maintenanceMessage"), at: now };
    }
    if (!cache.on) return next();
    // Admin bypass.
    const h = req.headers.authorization || "";
    const t = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (t) {
      try {
        const d = jwt.verify(t, process.env.JWT_SECRET);
        const u = await User.findById(d.id).select("role isAdmin");
        if (u && (u.isAdmin || u.role === "admin")) return next();
      } catch {}
    }
    return res.status(503).json({ maintenance: true, error: cache.msg || "We're performing scheduled maintenance. Please check back shortly." });
  } catch { next(); }
}

module.exports = { maintenance };
