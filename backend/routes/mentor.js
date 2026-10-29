const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Mentor = require("../models/Mentor");

router.get("/", async (req, res) => {
  const items = await Mentor.find({ active: true });
  res.json({ items });
});

router.post("/select", auth, async (req, res) => {
  const { id } = req.body || {};
  if (req.user.mentor) return res.status(400).json({ error: "mentor already set; contact support to change" });
  const m = await Mentor.findById(id);
  if (!m) return res.status(404).json({ error: "no mentor" });
  req.user.mentor = m._id;
  await req.user.save();
  res.json({ mentor: m });
});

module.exports = router;
