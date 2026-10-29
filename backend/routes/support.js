const router = require("express").Router();
const { auth } = require("../middleware/auth");
const SupportMessage = require("../models/SupportMessage");

// Current thread status for a user: ended if the latest message is marked closed.
async function statusFor(userId) {
  const last = await SupportMessage.findOne({ user: userId }).sort({ createdAt: -1 });
  return { ended: !!(last && last.closed), hasMessages: !!last };
}

// Member's own support thread.
router.get("/", auth, async (req, res) => {
  const items = await SupportMessage.find({ user: req.user._id }).sort({ createdAt: 1 }).limit(300);
  await SupportMessage.updateMany({ user: req.user._id, from: "staff", readByUser: false }, { readByUser: true });
  const st = await statusFor(req.user._id);
  res.json({ items, ended: st.ended });
});

router.post("/", auth, async (req, res) => {
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  if (text.length > 4000) return res.status(400).json({ error: "message too long" });
  // A new member message always reopens the thread (closed:false).
  const msg = await SupportMessage.create({ user: req.user._id, from: "user", text, closed: false, readByStaff: false });
  res.json({ msg });
});

module.exports = router;
