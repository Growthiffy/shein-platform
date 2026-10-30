// Mentor-room auto-reply. When a member's message sits unanswered in a mentor
// room and no mentor reply has posted in the last 4 hours, a reply from the
// mentor is auto-posted after a short (2-8 min) human-like delay. Driven lazily
// on the community GET for a mentor:<id> group.
const ChatMessage = require("../models/ChatMessage");
const Mentor = require("../models/Mentor");
const { generate, aiEnabled } = require("./ai");

const TEMPLATES = [
  "Thanks for your message! I'll review this shortly.",
  "Good question — let me look into that for you.",
  "I'm reviewing your portfolio. Give me a moment.",
  "Appreciate you reaching out, I'll get back with specifics soon.",
  "Noted — I'll follow up with some guidance shortly.",
];

const FOUR_H = 4 * 3600 * 1000;
function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h >>> 0; }

async function maybeMentorReply(group) {
  if (!group.startsWith("mentor:")) return;

  const last = await ChatMessage.findOne({ group }).sort({ createdAt: -1 });
  if (!last || last.authorType !== "user") return; // nothing to answer / already answered

  // Throttle: skip if a mentor already replied in the last 4 hours.
  const recent = await ChatMessage.exists({ group, authorType: "mentor", createdAt: { $gte: new Date(Date.now() - FOUR_H) } });
  if (recent) return;

  // Human-like delay (2-8 min), deterministic per triggering message.
  const delayMs = (120 + (hashStr(String(last._id)) % 361)) * 1000; // 120-480s
  if (Date.now() - new Date(last.createdAt).getTime() < delayMs) return;

  const mentorId = group.slice(7);
  const mentor = await Mentor.findById(mentorId).catch(() => null);
  if (!mentor) return;

  // Re-check throttle just before posting to shrink the double-post window.
  if (await ChatMessage.exists({ group, authorType: "mentor", createdAt: { $gte: new Date(Date.now() - FOUR_H) } })) return;

  let text = null;
  if (aiEnabled()) {
    text = await generate(
      `You are ${mentor.name}, a friendly investment mentor on a product-analyst platform. A member wrote: "${String(last.text).slice(0, 200)}". Reply in 1-2 short, warm, professional sentences. No greeting line, no sign-off.`,
      { maxTokens: 70, temperature: 0.7 }
    );
  }
  if (!text) text = TEMPLATES[hashStr(String(last._id)) % TEMPLATES.length];

  await ChatMessage.create({
    group, authorType: "mentor", authorName: mentor.name, authorAvatar: mentor.avatar,
    text, canReply: true,
  });
}

module.exports = { maybeMentorReply };
