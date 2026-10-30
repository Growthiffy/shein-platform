const router = require("express").Router();
const { auth } = require("../middleware/auth");
const SupportMessage = require("../models/SupportMessage");
const { getSettings } = require("../utils/settings");

// Member view = the CURRENT (active) session only. Ending a chat marks every
// message closed:true, so the member's next load is empty (a fresh chat). Admins
// still see the full history (all messages, every past session) via /api/admin.
router.get("/", auth, async (req, res) => {
  const items = await SupportMessage.find({ user: req.user._id, closed: false }).sort({ createdAt: 1 }).limit(300);
  await SupportMessage.updateMany({ user: req.user._id, from: "staff", readByUser: false, closed: false }, { readByUser: true });
  res.json({ items });
});

router.post("/", auth, async (req, res) => {
  const text = String(req.body?.text || "").replace(/\r\n/g, "\n").trim();
  if (!text) return res.status(400).json({ error: "empty" });
  if (text.length > 4000) return res.status(400).json({ error: "message too long" });

  // A new thread = no open messages before this one → trigger the auto-reply.
  const isNewThread = !(await SupportMessage.exists({ user: req.user._id, closed: false }));
  const msg = await SupportMessage.create({ user: req.user._id, from: "user", text, closed: false, readByStaff: false });

  if (isNewThread) {
    const s = await getSettings(["supportAutoReplyEnabled", "supportAutoReplyText"]);
    if (s.supportAutoReplyEnabled !== false) {
      const ticketNumber = String(Math.floor(100000 + Math.random() * 900000));
      const template = s.supportAutoReplyText || "Thank you for contacting Shein Support. Your ticket #{ticketNumber} has been created. A support specialist will respond within 24 hours.";
      const reply = template.replace(/\{ticketNumber\}/g, ticketNumber);
      await SupportMessage.create({ user: req.user._id, from: "system", text: reply, closed: false, readByUser: false });
    }
  }
  res.json({ msg });
});

// Member ends the chat: archive the current session (mark everything closed) and
// drop a system note. The next GET returns an empty, fresh thread.
router.post("/end", auth, async (req, res) => {
  const any = await SupportMessage.exists({ user: req.user._id, closed: false });
  if (!any) return res.json({ ok: true });
  await SupportMessage.create({ user: req.user._id, from: "system", text: "Chat ended by member.", closed: false });
  await SupportMessage.updateMany({ user: req.user._id }, { closed: true });
  res.json({ ok: true });
});

module.exports = router;
