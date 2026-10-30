const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Mentor = require("../models/Mentor");
const { statusFor } = require("../utils/mentorStatus");

router.get("/", async (req, res) => {
  const items = await Mentor.find({ active: true });
  const withStatus = await Promise.all(items.map(async m => {
    const s = await statusFor(m._id);
    return { ...m.toObject(), status: s.status, lastSeenAt: s.lastSeenAt };
  }));
  res.json({ items: withStatus });
});

router.post("/select", auth, async (req, res) => {
  const { id } = req.body || {};
  if (req.user.mentor) return res.status(400).json({ error: "mentor already set; contact support to change" });
  if (!id || !/^[0-9a-fA-F]{24}$/.test(String(id))) return res.status(400).json({ error: "bad mentor id" });
  const m = await Mentor.findOne({ _id: id, active: true });
  if (!m) return res.status(404).json({ error: "no mentor" });
  req.user.mentor = m._id;
  await req.user.save();
  res.json({ mentor: m });
});

module.exports = router;
