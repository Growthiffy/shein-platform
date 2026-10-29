// Community chatter engine. Produces a realistic, organic group chat: personas
// talk to EACH OTHER via conversation scripts (with replies + @mentions), at
// human-like pacing, with moods — active bursts, slow stretches, quiet periods,
// and "stepping away / back" lines. Driven lazily on community GET; a per-group
// ChatState row schedules the next line and is claimed atomically so concurrent
// requests never double-post.
const ChatMessage = require("../models/ChatMessage");
const Persona = require("../models/Persona");
const ChatState = require("../models/ChatState");
const LINES = require("../data/persona_lines.json");
const SCRIPTS = require("../data/persona_scripts.json");

const AWAY = [
  "stepping away for a bit, back later",
  "gotta run some errands, ttyl everyone",
  "taking a short break, back in a while",
  "heading out, catch you all later",
  "afk for a bit, ping me if needed",
];

const S = 1000, M = 60 * S;
const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function sample(arr, k) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}

// Gaps (ms)
const GAP = {
  within:   () => rand(18 * S, 55 * S),   // between lines of a live exchange
  standalone: () => rand(60 * S, 180 * S),
  afterScript: () => rand(90 * S, 300 * S),
  quiet:    () => rand(4 * M, 12 * M),
  seed:     () => rand(10 * S, 40 * S),
};

function buildMsg(group, last, speaker, text, { reply, mention } = {}) {
  const hasMention = mention && last && last.authorName;
  const body = (hasMention ? "@" + last.authorName + " " : "") + text;
  return {
    group, authorType: "persona", authorName: speaker.name, authorAvatar: speaker.avatar,
    text: body, canReply: true,
    replyTo: reply && last && last.id ? { id: last.id, authorName: last.authorName, text: String(last.text || "").slice(0, 140) } : undefined,
    mentions: hasMention ? [last.authorName] : [],
  };
}

// Decide the next emission from current state. Returns { messages, update, gapMs }.
function plan(state, personas) {
  const last = state.lastMsg || null;

  // Continue an active script.
  if (state.scriptId >= 0 && SCRIPTS[state.scriptId]) {
    const sc = SCRIPTS[state.scriptId];
    if (state.scriptStep < sc.lines.length) {
      const line = sc.lines[state.scriptStep];
      const sp = (state.speakers && state.speakers.length) ? state.speakers[line.role % state.speakers.length] : pick(personas);
      const msg = buildMsg(state.group, last, sp, line.text, line);
      const nextStep = state.scriptStep + 1;
      const done = nextStep >= sc.lines.length;
      return { messages: [msg], update: { scriptId: done ? -1 : state.scriptId, scriptStep: done ? 0 : nextStep, speakers: state.speakers }, gapMs: done ? GAP.afterScript() : GAP.within() };
    }
  }

  // Idle: start a new script / drop a standalone line / go quiet.
  const roll = Math.random();
  if (roll < 0.5 && personas.length >= 2) {
    const sid = Math.floor(Math.random() * SCRIPTS.length);
    const sc = SCRIPTS[sid];
    const need = Math.max(2, Math.min(sc.speakers, personas.length));
    const speakers = sample(personas, need).map(p => ({ name: p.name, avatar: p.avatar }));
    const line = sc.lines[0];
    const sp = speakers[line.role % speakers.length];
    const msg = buildMsg(state.group, last, sp, line.text, line);
    const done = sc.lines.length <= 1;
    return { messages: [msg], update: { scriptId: done ? -1 : sid, scriptStep: done ? 0 : 1, speakers }, gapMs: done ? GAP.afterScript() : GAP.within() };
  }
  if (roll < 0.72) {
    const sp = pick(personas);
    const text = Math.random() < 0.22 ? pick(AWAY) : pick(LINES);
    const msg = buildMsg(state.group, last, { name: sp.name, avatar: sp.avatar }, text, {});
    return { messages: [msg], update: { scriptId: -1, scriptStep: 0, speakers: state.speakers }, gapMs: GAP.standalone() };
  }
  return { messages: [], update: { scriptId: -1, scriptStep: 0, speakers: state.speakers }, gapMs: GAP.quiet() };
}

async function maybePost(group) {
  if (group !== "daily" && group !== "invest") return;
  const personas = await Persona.find({ active: true, group: { $in: [group, "both"] } });
  if (!personas.length) return;

  const now = Date.now();
  let st = await ChatState.findOne({ group });
  if (!st) { await ChatState.create({ group, nextAt: new Date(now + GAP.seed()), scriptId: -1 }); return; }
  if (st.nextAt && st.nextAt.getTime() > now) return;

  const p = plan(st, personas);

  // Atomic claim: only the request that still sees nextAt<=now wins.
  const claimed = await ChatState.findOneAndUpdate(
    { _id: st._id, nextAt: { $lte: new Date(now) } },
    { $set: { scriptId: p.update.scriptId, scriptStep: p.update.scriptStep, speakers: p.update.speakers || st.speakers || [], nextAt: new Date(now + p.gapMs) } },
    { new: false }
  );
  if (!claimed) return;

  let last = st.lastMsg;
  for (const m of p.messages) {
    const created = await ChatMessage.create(m);
    last = { id: created._id, authorName: created.authorName, text: created.text };
  }
  if (p.messages.length) await ChatState.updateOne({ _id: st._id }, { $set: { lastMsg: last } });
}

module.exports = { maybePost };
