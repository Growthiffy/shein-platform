const router = require("express").Router();
const { auth } = require("../middleware/auth");
const ChatMessage = require("../models/ChatMessage");
const { maybePost, currentTyping } = require("../utils/personaTick");
const { maybeMentorReply } = require("../utils/mentorTick");
const { typingNames } = require("../utils/presence");
const { fillGap } = require("../utils/backfill");
const Transaction = require("../models/Transaction");
const { notifyAdmins } = require("../utils/adminNotify");

// Per-member communities: each real member has their own daily/invest rooms,
// keyed `daily:<userId>` / `invest:<userId>`. Members never share a room. Mentor
// rooms are `mentor:<mentorId>:<userId>`. Legacy bare "daily"/"invest" still parse.
function gateFor(group) {
  if (group.startsWith("daily")) return "daily";
  if (group.startsWith("invest")) return "invest";
  if (group.startsWith("mentor:")) return "mentorRooms";
  return null;
}
function allowed(user, group) {
  const gate = gateFor(group);
  if (!gate) return true;
  if (user.communityAccess?.[gate] === false) return false;
  // Per-member daily/invest room: a member may only open their own; admins any.
  if (group.startsWith("daily:") || group.startsWith("invest:")) {
    const uid = group.split(":")[1];
    if (uid && !user.isAdmin && String(uid) !== String(user._id)) return false;
  }
  // Per-member mentor room (mentor:<mentorId>:<userId>).
  if (group.startsWith("mentor:")) {
    const parts = group.split(":");
    if (parts.length >= 3 && !user.isAdmin && String(parts[2]) !== String(user._id)) return false;
  }
  return true;
}

// Full community (daily/invest) requires Standard verification — Basic members
// get a verification prompt instead. Mentor rooms are not gated this way.
function verificationError(user, group) {
  const g = gateFor(group);
  if (g !== "daily" && g !== "invest") return null;
  if (user.isAdmin) return null;
  const level = user.verification?.level || "none";
  if (["standard", "premium"].includes(level)) return null;
  return { error: "Full community access requires Standard verification.", needsVerification: true };
}

// Groups: "daily" | "invest" | `mentor:<mentorId>`
router.get("/:group", auth, async (req, res) => {
  const group = req.params.group;
  if (!allowed(req.user, group)) return res.status(403).json({ error: "no access to this group" });
  const vErr = verificationError(req.user, group);
  if (vErr) return res.status(403).json(vErr);
  // Backfill a dense history first if the room has been quiet (member was away),
  // so returning users see hundreds of messages, not a frozen room.
  await fillGap(group).catch(() => {});
  // Fire persona chatter / mentor auto-reply (best-effort; never blocks chat).
  await maybePost(group).catch(() => {});
  await maybeMentorReply(group).catch(() => {});
  const items = await ChatMessage.find({ group }).sort({ createdAt: -1 }).limit(200);
  // Typing = automated personas + any real admin/mentor currently typing.
  const [pTyping, hTyping] = await Promise.all([
    currentTyping(group).catch(() => []),
    typingNames(group).catch(() => []),
  ]);
  const typing = [...new Set([...hTyping, ...pTyping])];
  res.json({ items: items.reverse(), typing });
});

// Toggle an emoji reaction on a message in this group.
router.post("/:group/react/:messageId", auth, async (req, res) => {
  const group = req.params.group;
  if (!allowed(req.user, group)) return res.status(403).json({ error: "no access to this group" });
  const vErr = verificationError(req.user, group);
  if (vErr) return res.status(403).json(vErr);
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
  const vErr = verificationError(req.user, group);
  if (vErr) return res.status(403).json(vErr);
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  const image = typeof req.body?.image === "string" && /^data:(image\/|application\/pdf)/.test(req.body.image) ? req.body.image : undefined;
  if (image && image.length > 4_000_000) return res.status(400).json({ error: "file too large (max ~3MB)" });
  if (!text && !image) return res.status(400).json({ error: "empty" });
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

  const authorName = req.user.username || req.user.email.split("@")[0];
  const msg = await ChatMessage.create({
    group, user: req.user._id,
    authorType: "user", authorName,
    text, replyTo, mentions, image, fileName: image ? String(req.body?.fileName || "").slice(0, 120) : undefined,
  });
  // A mentor-room message is a mentor DM, not a community post — label it so the
  // admin notification + deep-link go to the right place.
  const isMentorRoom = group.startsWith("mentor:");
  notifyAdmins(isMentorRoom ? "mentor" : "community", {
    title: isMentorRoom ? `Mentor message from ${authorName}` : `Community post by ${authorName}`,
    body: (text || (image ? "📎 attachment" : "")).slice(0, 140),
    user: req.user._id, userName: authorName, meta: { group },
  });
  res.json({ msg });
});

// Share a REAL transaction of your own as a payment-proof post (a receipt card
// members can flex in the community). Only daily/invest, only your own tx.
const KIND_TYPES = { withdrawal: ["withdrawal"], deposit: ["deposit"], invest: ["invest_lock"] };
const proofMoney = n => "$" + Number(Math.round(n)).toLocaleString("en-US");
router.post("/:group/share-proof", auth, async (req, res) => {
  const group = req.params.group;
  if (!group.startsWith("daily") && !group.startsWith("invest")) return res.status(400).json({ error: "can only share to daily or invest" });
  if (!allowed(req.user, group)) return res.status(403).json({ error: "no access to this group" });
  const vErr = verificationError(req.user, group);
  if (vErr) return res.status(403).json(vErr);

  const { txId, kind: rawKind } = req.body || {};
  let tx = null;
  if (txId) tx = await Transaction.findOne({ _id: txId, user: req.user._id }).catch(() => null);
  else {
    const types = KIND_TYPES[rawKind];
    if (!types) return res.status(400).json({ error: "txId or a valid kind required" });
    tx = await Transaction.findOne({ user: req.user._id, type: { $in: types } }).sort({ createdAt: -1 });
  }
  if (!tx) return res.status(404).json({ error: "no matching transaction to share" });

  const kind = tx.type === "invest_lock" ? "invest" : tx.type === "deposit" ? "deposit" : "withdrawal";
  const hex = n => { let s = ""; for (let i = 0; i < n; i++) s += "0123456789abcdef"[Math.floor(Math.random() * 16)]; return s; };
  const proof = {
    kind, amount: Math.round(tx.amount), chain: tx.chain || "TRC20",
    txid: tx.txHash || hex(52), address: tx.address || undefined,
    status: "Completed", at: tx.createdAt || new Date(),
  };
  if (kind === "invest") proof.tier = (tx.note || "").replace(/^Tier\s*/i, "") || undefined;

  const name = req.user.username || req.user.email.split("@")[0];
  const customText = String(req.body?.text || "").replace(/\r\n/g, "\n").trim().slice(0, 300);
  const verb = kind === "withdrawal" ? "just withdrew" : kind === "deposit" ? "just deposited" : "just invested";
  const text = customText || `${verb} ${proofMoney(proof.amount)} 🎉`;

  const msg = await ChatMessage.create({
    group, user: req.user._id, authorType: "user", authorName: name,
    authorAvatar: req.user.avatar, text, canReply: true, proof,
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
