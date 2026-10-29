const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "no token" });
    const data = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(data.id);
    if (!user) return res.status(401).json({ error: "bad token" });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
}

function admin(req, res, next) {
  const u = req.user;
  if (!u || (u.role !== "admin" && !u.isAdmin)) return res.status(403).json({ error: "forbidden" });
  next();
}

module.exports = { auth, admin };
