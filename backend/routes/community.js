const router = require("express").Router();
const { auth } = require("../middleware/auth");
const ChatMessage = require("../models/ChatMessage");
const { maybePost } = require("../utils/personaTick");

// Resolve the access gate a group maps to. daily/invest map to their own flag;
// any mentor:<id> room maps to mentorRooms. Unknown groups are allowed.
function gateFor(group) {
  if (group === "daily" || group === "invest") return group;
  if (group.startsWith("mentor:")) return "mentorRooms";
  return null;
}
function allowed(user, group) {
  const gate = gateFor(group);
  if (!gate) return true;
  return user.communityAccess?.[gate] !== false;
}

// Groups: "daily" | "invest" | `mentor:<mentorId>`
router.get("/:group", auth, async (req, res) => {
  const group = req.params.group;
  if (!allowed(req.user, group)) return res.status(403).json({ error: "no access to this group" });
  // Fire persona chatter (best-effort; never blocks chat).
  await maybePost(group).catch(() => {});
  const items = await ChatMessage.find({ group }).sort({ createdAt: -1 }).limit(200);
  res.json({ items: items.reverse() });
});

router.post("/:group", auth, async (req, res) => {
  const group = req.params.group;
  if (!allowed(req.user, group)) return res.status(403).json({ error: "no access to this group" });
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  if (text.length > 2000) return res.status(400).json({ error: "message too long" });
  const msg = await ChatMessage.create({
    group, user: req.user._id,
    authorType: "user", authorName: req.user.username || req.user.email.split("@")[0],
    text,
  });
  res.json({ msg });
});

// Delete a message: a member may delete their own; admins may delete any.
router.delete("/message/:id", auth, async (req, res) => {
  const m = await ChatMessage.findById(req.params.id);
  if (!m) return res.status(404).json({ error: "not found" });
  const owner = m.authorType === "user" && m.user && String(m.user) === String(req.user._id);
  if (!owner && !req.user.isAdmin) return res.status(403).json({ error: "not allowed" });
  await m.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
