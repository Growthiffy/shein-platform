// Lightweight, cron-less persona chatter. Called on community GET. If the last
// message in a group is older than the configured interval, one random active
// persona for that group posts a generic line. Deterministic, non-promotional.
const ChatMessage = require("../models/ChatMessage");
const Persona = require("../models/Persona");
const { getSetting } = require("./settings");
const LINES = require("../data/persona_lines.json");

async function maybePost(group) {
  if (group !== "daily" && group !== "invest") return;

  const intervalMin = Number(await getSetting("personaChatIntervalMin")) || 15;
  const last = await ChatMessage.findOne({ group }).sort({ createdAt: -1 });
  if (last && (Date.now() - new Date(last.createdAt).getTime()) < intervalMin * 60 * 1000) return;

  const personas = await Persona.find({ active: true, group: { $in: [group, "both"] } });
  if (!personas.length) return;

  const p = personas[Math.floor(Math.random() * personas.length)];
  const pool = (p.templates && p.templates.length) ? p.templates : LINES;
  const text = pool[Math.floor(Math.random() * pool.length)];

  await ChatMessage.create({
    group, authorType: "persona",
    authorName: p.name, authorAvatar: p.avatar,
    text, canReply: p.canReply,
  });
}

module.exports = { maybePost };
