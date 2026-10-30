// Community chatter engine. Produces a realistic, organic group chat: personas
// talk to EACH OTHER via conversation scripts (with replies + @mentions), at
// human-like pacing, with moods — active bursts, slow stretches, quiet periods,
// and "stepping away / back" lines. Driven lazily on community GET; a per-group
// ChatState row schedules the next line and is claimed atomically so concurrent
// requests never double-post.
const ChatMessage = require("../models/ChatMessage");
const Persona = require("../models/Persona");
const ChatState = require("../models/ChatState");
const ChatTyping = require("../models/ChatTyping");
const { getSettings } = require("../utils/settings");
const { generate, aiEnabled } = require("./ai");
const { humanPresent } = require("./presence");
const LINES = require("../data/persona_lines.json");
const SCRIPTS = require("../data/persona_scripts.json");

// Reactions personas sprinkle on their own messages, so the chat looks lived-in.
const REACT_EMOJIS = ["fire", "thumbsup", "heart", "clap", "rocket", "eyes", "100"];
function seedReactions() {
  if (Math.random() < 0.45) return []; // many messages have none
  const n = 1 + Math.floor(Math.random() * 3);
  const picked = sample(REACT_EMOJIS, n);
  return picked.map(e => ({ emoji: e, count: 1 + Math.floor(Math.random() * 3), users: [] }));
}

// Personas only chatter during configured active hours (server timezone).
async function withinActiveHours() {
  const s = await getSettings(["personaActiveHoursStart", "personaActiveHoursEnd"]);
  const start = Number(s.personaActiveHoursStart);
  const end = Number(s.personaActiveHoursEnd);
  const h = new Date().getHours();
  if (Number.isNaN(start) || Number.isNaN(end)) return true;
  return start <= end ? (h >= start && h < end) : (h >= start || h < end);
}

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
  within:   () => rand(12 * S, 35 * S),   // between lines of a live exchange
  standalone: () => rand(30 * S, 90 * S),
  afterScript: () => rand(30 * S, 90 * S),
  quiet:    () => rand(60 * S, 150 * S),
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
  if (roll < 0.65 && personas.length >= 2) {
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
  if (roll < 0.9) {
    const sp = pick(personas);
    const text = Math.random() < 0.22 ? pick(AWAY) : pick(LINES);
    const msg = buildMsg(state.group, last, { name: sp.name, avatar: sp.avatar }, text, {});
    return { messages: [msg], update: { scriptId: -1, scriptStep: 0, speakers: state.speakers }, gapMs: GAP.standalone() };
  }
  return { messages: [], update: { scriptId: -1, scriptStep: 0, speakers: state.speakers }, gapMs: GAP.quiet() };
}

// Current active typing indicators for a group (persona names).
async function currentTyping(group) {
  const now = new Date();
  const rows = await ChatTyping.find({ group, expiresAt: { $gt: now } }).limit(3);
  return rows.map(r => r.personaName);
}

// Populate a believable backlog the first time a group is quiet, so the room
// looks alive immediately (independent of active hours / live pacing). Messages
// are given staggered past timestamps across the last ~8 hours.
async function seedBacklog(group) {
  if (group !== "daily" && group !== "invest") return;
  if (await ChatMessage.countDocuments({ group, authorType: "persona" }) >= 12) return;

  const personas = await Persona.find({ active: true, group: { $in: [group, "both"] } });
  if (personas.length < 2) return;

  const now = Date.now();
  let t = now - 8 * 3600 * 1000;
  const docs = [];
  while (docs.length < 24 && t < now - 60 * S) {
    if (Math.random() < 0.55) {
      const sc = SCRIPTS[Math.floor(Math.random() * SCRIPTS.length)];
      const need = Math.max(2, Math.min(sc.speakers, personas.length));
      const speakers = sample(personas, need).map(p => ({ name: p.name, avatar: p.avatar }));
      let last = docs.length ? docs[docs.length - 1] : null;
      for (const line of sc.lines) {
        const sp = speakers[line.role % speakers.length];
        const hasMention = line.mention && last;
        docs.push(baseDoc(group, sp, (hasMention ? "@" + last.authorName + " " : "") + line.text, hasMention ? [last.authorName] : [], new Date(t)));
        last = docs[docs.length - 1];
        t += rand(20 * S, 150 * S);
      }
    } else {
      const sp = pick(personas);
      docs.push(baseDoc(group, { name: sp.name, avatar: sp.avatar }, pick(LINES), [], new Date(t)));
      t += rand(90 * S, 300 * S);
    }
  }
  if (docs.length) await ChatMessage.collection.insertMany(docs).catch(() => {});
}

function baseDoc(group, sp, text, mentions, at) {
  return {
    group, authorType: "persona", authorName: sp.name, authorAvatar: sp.avatar || null,
    text, canReply: true, mentions: mentions || [], reactions: seedReactions(),
    createdAt: at, updatedAt: at,
  };
}

// Friendly replies used when AI is unavailable. {n} = the member's name.
const USER_REPLIES = [
  "hey @{n}, welcome! how's your day going?",
  "@{n} hi! you doing the analyst cycle today?",
  "yo @{n} 👋 good to see a new face",
  "@{n} hey hey, what tier are you on?",
  "hi @{n}! ask away if you need anything, we're friendly here",
  "@{n} welcome in, the latest collection items are paying well today",
  "hey @{n}, just finished my cycle, how about you?",
  "@{n} 👋 morning/evening wherever you are lol",
];

// Reassurance replies for when a member sounds worried, confused, or raises a
// technical/payment issue. Personas are long-time members who trust the company:
// they stay calm, share a believable personal anecdote, affirm the platform is
// legit, and point to Support — never confirm a real fault or badmouth Shein.
const SUPPORT_REPLIES = [
  "@{n} ah don't worry, had the same thing once — turned out to be a routine network sync delay, cleared by itself. if it hangs around just ping support, they're quick 👍",
  "@{n} happened to me last month, was just the verification queue catching up. support sorted it in like an hour. shein's solid, you're fine",
  "@{n} relax, mine showed 'pending' for a bit too — it was a weekend batch thing. opened a support ticket and it was done same day",
  "@{n} i panicked over that exact thing lol, support explained it was a scheduled wallet maintenance window. all good after. definitely message them",
  "@{n} that's usually just a cache/display lag on the app side, not your balance. force refresh, and if it sticks hit support — they always fix mine fast",
  "@{n} been here over a year, never lost a cent. stuff like that is almost always a temp processing delay. support will confirm, give them a shout",
  "@{n} totally normal, had a withdrawal sit a day once during a provider switch. support walked me through it. shein's legit, don't stress",
];
// Keywords that flip a reply into reassurance/support-deflection mode.
const CONCERN_RE = /\b(scam|fake|legit|real|fraud|stuck|frozen|freeze|lost|missing|error|errors|bug|not work|doesn'?t work|can'?t|cant|won'?t|wont|problem|issue|withdraw|withdrawal|pending|delay|delayed|refund|hacked|support|help|wrong|failed|decline)\b/i;

const hashStr = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h >>> 0; };

// Human-like reply delay, deterministic per message. ~60% quick (3-15s), ~40%
// slower (30-180s), so personas sometimes answer fast and sometimes take a while.
function replyDelayMs(id) {
  const h = hashStr(String(id));
  const quick = (h % 100) < 60;
  return quick ? (3 + (h % 13)) * 1000 : (30 + (h % 151)) * 1000;
}

// When a real member's message is the latest in the room, a persona answers it
// after a human-like delay so members feel heard. Returns true if it posted.
async function maybeReplyToUser(group, personas) {
  const last = await ChatMessage.findOne({ group }).sort({ createdAt: -1 });
  if (!last || last.authorType !== "user") return false;

  if (Date.now() - new Date(last.createdAt).getTime() < replyDelayMs(last._id)) return false;

  // Recent context so an AI reply can follow the actual conversation.
  const recent = await ChatMessage.find({ group }).sort({ createdAt: -1 }).limit(6);
  const sp = personas[hashStr(String(last._id) + "p") % personas.length];
  const name = last.authorName || "there";
  const concerned = CONCERN_RE.test(String(last.text || ""));

  let text = null;
  if (aiEnabled()) {
    const convo = recent.reverse().map(m => `${m.authorName}: ${String(m.text).slice(0, 160)}`).join("\n");
    const system =
      "You role-play a happy, long-time member of the Shein product-analyst & investing platform. " +
      "You genuinely trust the company: it is legitimate, real, and pays out. NEVER agree it is a scam, " +
      "never badmouth it, never confirm a real fault or outage. Stay warm and calm. If the member is " +
      "worried or reports a technical/payment problem, reassure them with a short believable personal " +
      "anecdote (a routine delay, a verification queue, scheduled maintenance that resolved itself) and " +
      "suggest they contact Support — do not promise anything specific. One short informal line, lowercase ok, no hashtags.";
    text = await generate(
      `You are ${sp.name}. Recent messages:\n${convo}\n\nReply to ${name}'s last message in ONE short line (max 28 words). Start with @${name}.`,
      { maxTokens: 70, temperature: 0.9, system, cacheKey: `reply:${last._id}` }
    );
  }
  if (!text) {
    const pool = concerned ? SUPPORT_REPLIES : USER_REPLIES;
    text = pool[hashStr(String(last._id)) % pool.length].replace(/\{n\}/g, name);
  }

  // Claim: only post if the member's message is still the latest (no double reply).
  const stillLast = await ChatMessage.findOne({ group }).sort({ createdAt: -1 }).select("_id");
  if (!stillLast || String(stillLast._id) !== String(last._id)) return false;

  await ChatMessage.create({
    group, authorType: "persona", authorName: sp.name, authorAvatar: sp.avatar,
    text, canReply: true, mentions: [name],
    replyTo: { id: last._id, authorName: last.authorName, text: String(last.text || "").slice(0, 140) },
    reactions: [],
  });
  return true;
}

async function maybePost(group) {
  if (group !== "daily" && group !== "invest") return;
  await seedBacklog(group).catch(() => {}); // one-time populate so the room is never empty
  if (!(await withinActiveHours())) return; // live chatter only during active hours

  // Hard mute: if a real admin/mentor is live in this room, personas go silent
  // (no ambient chatter, no replies) so no one talks over a real human.
  if (await humanPresent(group).catch(() => false)) return;

  // Members come first: answer a waiting member before ambient chatter.
  {
    const ps = await Persona.find({ active: true, group: { $in: [group, "both"] } });
    if (ps.length && await maybeReplyToUser(group, ps).catch(() => false)) return;
  }

  const personas = await Persona.find({ active: true, group: { $in: [group, "both"] } });
  if (!personas.length) return;

  const now = Date.now();
  let st = await ChatState.findOne({ group });
  if (!st) { await ChatState.create({ group, nextAt: new Date(now + GAP.seed()), scriptId: -1 }); return; }
  if (st.nextAt && st.nextAt.getTime() > now) return;

  // Phase 2: a message was queued behind a typing indicator — post it now.
  if (st.pending && Array.isArray(st.pending.messages)) {
    const claimed = await ChatState.findOneAndUpdate(
      { _id: st._id, nextAt: { $lte: new Date(now) }, pending: { $ne: null } },
      { $set: { nextAt: new Date(now + st.pending.gapMs), pending: null } },
      { new: false }
    );
    if (!claimed) return;
    const pend = claimed.pending;
    let last = st.lastMsg;
    for (const m of pend.messages) {
      const created = await ChatMessage.create({ ...m, reactions: seedReactions() });
      last = { id: created._id, authorName: created.authorName, text: created.text };
    }
    await ChatTyping.deleteMany({ group }).catch(() => {});
    await ChatState.updateOne({ _id: st._id }, {
      $set: { lastMsg: last, scriptId: pend.update.scriptId, scriptStep: pend.update.scriptStep, speakers: pend.update.speakers || st.speakers || [] },
    });
    return;
  }

  // Phase 1: decide what to say. If something, show a typing indicator and queue it.
  const p = plan(st, personas);
  if (!p.messages.length) {
    await ChatState.findOneAndUpdate(
      { _id: st._id, nextAt: { $lte: new Date(now) } },
      { $set: { scriptId: p.update.scriptId, scriptStep: p.update.scriptStep, speakers: p.update.speakers || st.speakers || [], nextAt: new Date(now + p.gapMs) } },
    );
    return;
  }

  const typeMs = rand(3 * S, 7 * S);
  const claimed = await ChatState.findOneAndUpdate(
    { _id: st._id, nextAt: { $lte: new Date(now) }, pending: null },
    { $set: { nextAt: new Date(now + typeMs), pending: { messages: p.messages, update: p.update, gapMs: p.gapMs } } },
    { new: false }
  );
  if (!claimed) return;

  // Write typing markers for the speaker(s) of the queued messages.
  const names = [...new Set(p.messages.map(m => m.authorName))].slice(0, 2);
  const expiresAt = new Date(now + typeMs + 2000);
  await ChatTyping.insertMany(names.map(n => ({ group, personaName: n, expiresAt }))).catch(() => {});
}

module.exports = { maybePost, currentTyping };
