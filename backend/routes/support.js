const router = require("express").Router();
const { auth } = require("../middleware/auth");
const SupportMessage = require("../models/SupportMessage");

// Member's own support thread.
router.get("/", auth, async (req, res) => {
  const items = await SupportMessage.find({ user: req.user._id }).sort({ createdAt: 1 }).limit(200);
  // Mark staff replies as read by the user.
  await SupportMessage.updateMany({ user: req.user._id, from: "staff", readByUser: false }, { readByUser: true });
  res.json({ items });
});

router.post("/", auth, async (req, res) => {
  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "empty" });
  const msg = await SupportMessage.create({ user: req.user._id, from: "user", text: text.trim(), readByStaff: false });
  res.json({ msg });
});

module.exports = router;
