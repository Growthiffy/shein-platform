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
const MentorRead = require("../models/MentorRead");
const { heartbeat, clear } = require("../utils/presence");

router.use(auth, admin);

// Every mentor profile this operator controls (an admin may own several).
async function myMentors(user) {
  return Mentor.find({ owner: user._id }).sort({ createdAt: 1 });
}
function roomFor(mentorId, userId) { return `mentor:${mentorId}:${userId}`; }

// The specific owned mentor a given mentee belongs to (or null if not mine).
async function mentorForMentee(user, userId) {
  const u = await User.findById(userId).select("username email avatar mentor");
  if (!u || !u.mentor) return { u: null, m: null };
  const m = await Mentor.findOne({ _id: u.mentor, owner: user._id });
  return { u, m };
}

// Am I a mentor? (drives the dashboard nav + page gate) — returns ALL mentors I own.
router.get("/me", async (req, res) => {
  const list = await myMentors(req.user);
  const mentors = list.map(m => ({ _id: m._id, name: m.name, title: m.title, avatar: m.avatar, active: m.active }));
  res.json({ mentor: mentors[0] || null, mentors });
});

// Members across all mentors I own, each tagged with the mentor they chose and a
// WhatsApp-style unread count (member messages since the operator last opened the
// room). Also returns a per-mentor summary: member count + total unread.
router.get("/mentees", async (req, res) => {
  const list = await myMentors(req.user);
  if (!list.length) return res.json({ mentor: null, mentors: [], items: [] });
  const mById = new Map(list.map(m => [String(m._id), m]));
  const users = await User.find({ mentor: { $in: list.map(m => m._id) }, role: "customer" })
    .select("username email avatar verification accountNumber createdAt mentor").sort({ createdAt: -1 }).limit(500);

  // Read markers for this operator's mentees, keyed by mentee id.
  const reads = await MentorRead.find({ mentor: { $in: list.map(m => m._id) }, mentee: { $in: users.map(u => u._id) } }).select("mentee lastReadAt");
  const readBy = new Map(reads.map(r => [String(r.mentee), r.lastReadAt]));

  const items = await Promise.all(users.map(async u => {
    const m = mById.get(String(u.mentor));
    const group = roomFor(u.mentor, u._id);
    const last = await ChatMessage.findOne({ group }).sort({ createdAt: -1 }).select("text authorType createdAt image fileName");
    const readAt = readBy.get(String(u._id));
    const unread = await ChatMessage.countDocuments({ group, authorType: "user", ...(readAt ? { createdAt: { $gt: readAt } } : {}) });
    const preview = last ? (last.text ? String(last.text).slice(0, 80) : (last.image ? (last.fileName || "📎 attachment") : "")) : null;
    return {
      _id: u._id, name: u.username || (u.email || "").split("@")[0], avatar: u.avatar || null,
      accountNumber: u.accountNumber, verification: u.verification?.level || "none",
      mentorId: String(u.mentor), mentorName: m ? m.name : "Mentor",
      lastText: preview, lastAt: last ? last.createdAt : null,
      lastFromMember: !!last && last.authorType === "user", unread,
    };
  }));
  items.sort((a, b) => (b.unread - a.unread) || (new Date(b.lastAt || 0) - new Date(a.lastAt || 0)));

  // Per-mentor tallies for the top switcher.
  const mentors = list.map(m => {
    const mine = items.filter(it => it.mentorId === String(m._id));
    return {
      _id: m._id, name: m.name, title: m.title, avatar: m.avatar,
      memberCount: mine.length, unread: mine.reduce((s, it) => s + it.unread, 0),
    };
  });
  res.json({ mentor: mentors[0] || null, mentors, items });
});

// Load a mentee's 1:1 room (member must belong to a mentor I own).
router.get("/room/:userId", async (req, res) => {
  const { u, m } = await mentorForMentee(req.user, req.params.userId);
  if (!m) return res.status(404).json({ error: "not your mentee" });
  const group = roomFor(m._id, u._id);
  const items = await ChatMessage.find({ group }).sort({ createdAt: -1 }).limit(200);
  // Opening the room marks it read (WhatsApp-style).
  await MentorRead.updateOne({ mentor: m._id, mentee: u._id }, { $set: { lastReadAt: new Date() } }, { upsert: true }).catch(() => {});
  res.json({
    mentee: { _id: u._id, name: u.username || (u.email || "").split("@")[0], avatar: u.avatar || null },
    mentor: { _id: m._id, name: m.name, avatar: m.avatar },
    group, items: items.reverse(),
  });
});

// Reply to a mentee as the mentor they chose.
router.post("/room/:userId", async (req, res) => {
  const { u, m } = await mentorForMentee(req.user, req.params.userId);
  if (!m) return res.status(404).json({ error: "not your mentee" });
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
  const list = await myMentors(req.user);
  const owned = list.find(m => group.startsWith(`mentor:${m._id}`));
  const name = owned ? owned.name : (req.user.username || "Shein Staff");
  await heartbeat({ group, user: req.user._id, name, kind: owned ? "mentor" : "admin", typing });
  res.json({ ok: true });
});
router.post("/presence/clear", async (req, res) => {
  const group = String(req.body?.group || "").trim();
  if (group) await clear({ group, user: req.user._id });
  res.json({ ok: true });
});

module.exports = router;
