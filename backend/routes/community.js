const router = require("express").Router();
const { auth } = require("../middleware/auth");
const ChatMessage = require("../models/ChatMessage");
const { maybePost, currentTyping } = require("../utils/personaTick");
const { maybeMentorReply } = require("../utils/mentorTick");

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
  // Fire persona chatter / mentor auto-reply (best-effort; never blocks chat).
  await maybePost(group).catch(() => {});
  await maybeMentorReply(group).catch(() => {});
  const items = await ChatMessage.find({ group }).sort({ createdAt: -1 }).limit(200);
  const typing = await currentTyping(group).catch(() => []);
  res.json({ items: items.reverse(), typing });
});

// Toggle an emoji reaction on a message in this group.
router.post("/:group/react/:messageId", auth, async (req, res) => {
  const group = req.params.group;
  if (!allowed(req.user, group)) return res.status(403).json({ error: "no access to this group" });
  const emoji = String(req.body?.emoji || "").slice(0, 24).trim();
  if (!emoji) return res.status(400).json({ error: "emoji required" });

  const msg = await ChatMessage.findOne({ _id: req.params.messageId, group });
  if (!msg) return res.status(404).json({ error: "not found" });

  const uid = String(req.user._id);
  let r = (msg.reactions || []).find(x => x.emoji === emoji);
  if (!r) { r = { emoji, count: 0, users: [] }; msg.reactions.push(r); r = msg.reactions[msg.reactions.length - 1]; }
  const idx = r.users.findIndex(u => String(u) === uid);
  if (idx >= 0) { r.users.splice(idx, 1); r.count = Math.max(0, r.count - 1); }
  else { r.users.push(req.user._id); r.count += 1; }
  msg.reactions = msg.reactions.filter(x => x.count > 0);
  await msg.save();
  res.json({ reactions: msg.reactions.map(x => ({ emoji: x.emoji, count: x.count })) });
});

router.post("/:group", auth, async (req, res) => {
  const group = req.params.group;
  if (!allowed(req.user, group)) return res.status(403).json({ error: "no access to this group" });
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  if (text.length > 2000) return res.status(400).json({ error: "message too long" });

  // Reply snapshot (must reference a message in the same group).
  let replyTo;
  const rid = req.body?.replyTo;
  if (rid) {
    const ref = await ChatMessage.findOne({ _id: rid, group }).catch(() => null);
    if (ref) replyTo = { id: ref._id, authorName: ref.authorName, text: String(ref.text || "").slice(0, 140) };
  }
  // @mentions parsed from the text.
  const mentions = [...new Set((text.match(/@([A-Za-z0-9._-]{2,30})/g) || []).map(s => s.slice(1)))];

  const msg = await ChatMessage.create({
    group, user: req.user._id,
    authorType: "user", authorName: req.user.username || req.user.email.split("@")[0],
    text, replyTo, mentions,
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
