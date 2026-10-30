// "My Juniors" — the mentor-admin workspace. An admin operator who owns a Mentor
// profile uses these endpoints to see the members assigned to them and to chat
// with each one as the real mentor (1:1 room mentor:<mentorId>:<userId>). A live
// presence heartbeat mutes the automated personas / mentor auto-reply while the
// operator has a room open, so a real human is never talked over.
const router = require("express").Router();
const { auth, admin } = require("../middleware/auth");
const User = require("../models/User");
const Mentor = require("../models/Mentor");
const ChatMessage = require("../models/ChatMessage");
const { heartbeat, clear } = require("../utils/presence");

router.use(auth, admin);

// The Mentor profile this operator controls (if any).
async function myMentor(user) {
  return Mentor.findOne({ owner: user._id });
}
function roomFor(mentorId, userId) { return `mentor:${mentorId}:${userId}`; }

// Am I a mentor? (drives the dashboard nav + page gate)
router.get("/me", async (req, res) => {
  const m = await myMentor(req.user);
  res.json({ mentor: m ? { _id: m._id, name: m.name, title: m.title, avatar: m.avatar, active: m.active } : null });
});

// Members assigned to me, with a snapshot of their 1:1 room.
router.get("/mentees", async (req, res) => {
  const m = await myMentor(req.user);
  if (!m) return res.json({ mentor: null, items: [] });
  const users = await User.find({ mentor: m._id, role: "customer" })
    .select("username email avatar verification accountNumber createdAt").sort({ createdAt: -1 }).limit(500);

  const items = await Promise.all(users.map(async u => {
    const group = roomFor(m._id, u._id);
    const last = await ChatMessage.findOne({ group }).sort({ createdAt: -1 }).select("text authorType createdAt");
    // Unanswered = member's message is the latest in their room.
    const waiting = !!last && last.authorType === "user";
    return {
      _id: u._id, name: u.username || (u.email || "").split("@")[0], avatar: u.avatar || null,
      accountNumber: u.accountNumber, verification: u.verification?.level || "none",
      lastText: last ? String(last.text).slice(0, 80) : null,
      lastAt: last ? last.createdAt : null, waiting,
    };
  }));
  // Members waiting on a reply float to the top, then by most recent activity.
  items.sort((a, b) => (b.waiting - a.waiting) || (new Date(b.lastAt || 0) - new Date(a.lastAt || 0)));
  res.json({ mentor: { _id: m._id, name: m.name, title: m.title, avatar: m.avatar }, items });
});

// Load a mentee's 1:1 room (must be assigned to me).
router.get("/room/:userId", async (req, res) => {
  const m = await myMentor(req.user);
  if (!m) return res.status(403).json({ error: "not a mentor" });
  const u = await User.findOne({ _id: req.params.userId, mentor: m._id }).select("username email avatar");
  if (!u) return res.status(404).json({ error: "not your mentee" });
  const group = roomFor(m._id, u._id);
  const items = await ChatMessage.find({ group }).sort({ createdAt: -1 }).limit(200);
  res.json({
    mentee: { _id: u._id, name: u.username || (u.email || "").split("@")[0], avatar: u.avatar || null },
    group, items: items.reverse(),
  });
});

// Reply to a mentee as the real mentor.
router.post("/room/:userId", async (req, res) => {
  const m = await myMentor(req.user);
  if (!m) return res.status(403).json({ error: "not a mentor" });
  const u = await User.findOne({ _id: req.params.userId, mentor: m._id }).select("_id");
  if (!u) return res.status(404).json({ error: "not your mentee" });
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  const image = typeof req.body?.image === "string" && /^data:(image\/|application\/pdf)/.test(req.body.image) ? req.body.image : undefined;
  if (image && image.length > 4_000_000) return res.status(400).json({ error: "file too large (max ~3MB)" });
  if (!text && !image) return res.status(400).json({ error: "empty" });
  if (text.length > 2000) return res.status(400).json({ error: "message too long" });
  const group = roomFor(m._id, u._id);

  let replyTo;
  if (req.body?.replyTo) {
    const ref = await ChatMessage.findOne({ _id: req.body.replyTo, group }).catch(() => null);
    if (ref) replyTo = { id: ref._id, authorName: ref.authorName, text: String(ref.text || "").slice(0, 140) };
  }
  const mentions = [...new Set((text.match(/@([A-Za-z0-9._-]{2,30})/g) || []).map(s => s.slice(1)))];
  const msg = await ChatMessage.create({
    group, authorType: "mentor", authorName: m.name, authorAvatar: m.avatar,
    text, canReply: true, replyTo, mentions, image, fileName: image ? String(req.body?.fileName || "").slice(0, 120) : undefined,
  });
  // Refresh my presence so personas stay muted right after I post.
  await heartbeat({ group, user: req.user._id, name: m.name, kind: "mentor", typing: false }).catch(() => {});
  res.json({ msg });
});

// Presence heartbeat for any room I'm viewing (mentor room or daily/invest). Mutes
// personas / mentor auto-reply and shows members a real "typing…" indicator.
router.post("/presence", async (req, res) => {
  const group = String(req.body?.group || "").trim();
  if (!group) return res.status(400).json({ error: "group required" });
  const typing = !!req.body?.typing;
  const m = await myMentor(req.user);
  const ownsRoom = m && group.startsWith(`mentor:${m._id}`);
  const name = ownsRoom ? m.name : (req.user.username || "Shein Staff");
  await heartbeat({ group, user: req.user._id, name, kind: ownsRoom ? "mentor" : "admin", typing });
  res.json({ ok: true });
});
router.post("/presence/clear", async (req, res) => {
  const group = String(req.body?.group || "").trim();
  if (group) await clear({ group, user: req.user._id });
  res.json({ ok: true });
});

module.exports = router;
