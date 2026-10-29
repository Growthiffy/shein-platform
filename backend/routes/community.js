const router = require("express").Router();
const { auth } = require("../middleware/auth");
const ChatMessage = require("../models/ChatMessage");

// Groups: "daily" | "invest" | `mentor:<mentorId>`
router.get("/:group", auth, async (req, res) => {
  const items = await ChatMessage.find({ group: req.params.group }).sort({ createdAt: -1 }).limit(200);
  res.json({ items: items.reverse() });
});

router.post("/:group", auth, async (req, res) => {
  const { text } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: "empty" });
  const msg = await ChatMessage.create({
    group: req.params.group, user: req.user._id,
    authorType: "user", authorName: req.user.username || req.user.email.split("@")[0],
    text: text.trim(),
  });
  res.json({ msg });
});

module.exports = router;
