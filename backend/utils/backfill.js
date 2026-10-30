// Gap backfill: when a community room has been quiet for a while (e.g. a member
// was away for days), synthesize a dense, believable history of messages spread
// across the gap and insert them all at once on the next load — so the room
// never looks frozen. Content comes from the static script/line pools plus
// occasional "payment proof" posts (withdrawal / deposit / investment receipts),
// which render as screenshot-style cards in the chat. No AI, no per-message work:
// one bulk insertMany, fast.
const ChatMessage = require("../models/ChatMessage");
const ChatState = require("../models/ChatState");
const Persona = require("../models/Persona");
const { getSettings } = require("./settings");
const LINES = require("../data/persona_lines.json");
const SCRIPTS = require("../data/persona_scripts.json");

const S = 1000, M = 60 * S, H = 60 * M;
const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function sample(arr, k) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}
const REACTS = ["fire", "thumbsup", "heart", "clap", "rocket", "eyes", "100", "money"];
function seedReactions(boost) {
  if (!boost && Math.random() < 0.5) return [];
  const n = 1 + Math.floor(Math.random() * (boost ? 4 : 3));
  return sample(REACTS, n).map(e => ({ emoji: e, count: 1 + Math.floor(Math.random() * (boost ? 9 : 4)), users: [] }));
}

const CHAINS = ["TRC20", "ERC20", "BEP20", "BTC"];
const TIERS = ["Starter", "Silver", "Gold", "Platinum", "Diamond"];
function hex(n) { let s = ""; const c = "0123456789abcdef"; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)]; return s; }
function txid() { return (Math.random() < 0.4 ? "0x" : "") + hex(Math.random() < 0.4 ? 40 : 52); }
function addr() { return (Math.random() < 0.5 ? "0x" : "T") + hex(Math.random() < 0.5 ? 40 : 33); }

// Build a payment-proof post (text + proof card params).
function makeProof(group, at) {
  let kind;
  if (group === "invest") kind = pick(["invest", "invest", "withdrawal", "deposit"]);
  else kind = pick(["withdrawal", "withdrawal", "deposit", "invest"]);
  const proof = { kind, chain: pick(CHAINS), txid: txid(), address: addr(), status: "Completed", at };
  if (kind === "invest") { proof.amount = pick([300, 500, 750, 1000, 1500, 2500, 5000]); proof.tier = pick(TIERS); }
  else proof.amount = Math.round(rand(120, 4600) / 10) * 10;
  return proof;
}
const money = n => "$" + Number(n).toLocaleString("en-US");
function proofText(p) {
  if (p.kind === "withdrawal") return pick([
    `just pulled my profits out 🤑 ${money(p.amount)} already in my wallet`,
    `withdrawal cleared again, ${money(p.amount)} 💸 this platform never misses`,
    `cashed out this week's gains ${money(p.amount)} 🙌 proof attached`,
    `${money(p.amount)} withdrawal done ✅ took like an hour, smooth as always`,
  ]);
  if (p.kind === "deposit") return pick([
    `topped up ${money(p.amount)} to scale faster 🚀`,
    `added ${money(p.amount)} to the balance, time to grind 💪`,
    `just funded ${money(p.amount)} more, compounding szn 📈`,
  ]);
  return pick([
    `reinvested ${money(p.amount)} into ${p.tier}, letting it compound 💎`,
    `locked ${money(p.amount)} on ${p.tier} tier 🔒📈 lfg`,
    `just moved ${money(p.amount)} into ${p.tier}, weekly payouts here we go 🤝`,
  ]);
}

function doc(group, sp, text, { mentions = [], replyTo, at, proof, boost } = {}) {
  return {
    group, authorType: "persona", authorName: sp.name, authorAvatar: sp.avatar || null,
    text, canReply: true, mentions, replyTo, proof,
    reactions: seedReactions(boost), createdAt: at, updatedAt: at,
  };
}

async function withinActive() {
  const s = await getSettings(["personaActiveHoursStart", "personaActiveHoursEnd"]);
  const start = Number(s.personaActiveHoursStart), end = Number(s.personaActiveHoursEnd);
  return (ms) => {
    if (Number.isNaN(start) || Number.isNaN(end)) return true;
    const h = new Date(ms).getHours();
    return start <= end ? (h >= start && h < end) : (h >= start || h < end);
  };
}

const GAP_MIN = 25 * M;        // only backfill if quiet at least this long
const MAX_SPAN = 4 * 24 * H;   // synthesize at most ~4 days of history per fill
const CAP = 500;               // max messages per fill
const KEEP = 800;              // trim room to newest N afterwards

// Fill the gap for a group. Returns count inserted. Safe to call on every GET;
// it no-ops unless the room has actually been quiet, and claims a short lock so
// concurrent requests can't double-fill.
async function fillGap(group) {
  const base = (group && group.startsWith("daily")) ? "daily" : (group && group.startsWith("invest")) ? "invest" : null;
  if (!base) return 0;

  const personas = await Persona.find({ active: true, group: { $in: [base, "both"] } });
  if (personas.length < 2) return 0;

  const last = await ChatMessage.findOne({ group }).sort({ createdAt: -1 }).select("createdAt");
  const now = Date.now();
  let startAt = last ? new Date(last.createdAt).getTime() : now - 8 * H;
  let gap = now - startAt;
  if (gap < GAP_MIN) return 0;

  // Claim: only one request fills at a time (lock expires after 60s).
  const claim = await ChatState.findOneAndUpdate(
    { group, $or: [{ backfillAt: null }, { backfillAt: { $lt: new Date(now - 60 * S) } }] },
    { $set: { backfillAt: new Date(now) }, $setOnInsert: { group } },
    { upsert: true, new: false }
  ).catch(() => "taken");
  if (claim === "taken") return 0;

  try {
  if (gap > MAX_SPAN) { startAt = now - MAX_SPAN; gap = MAX_SPAN; }
  const active = await withinActive();

  const docs = [];
  let t = startAt + rand(M, 4 * M);
  while (t < now - 30 * S && docs.length < CAP) {
    if (!active(t)) { t += 20 * M; continue; }  // skip quiet hours fast
    const roll = Math.random();
    if (roll < 0.58) {                          // multi-line script conversation
      const sc = pick(SCRIPTS);
      const need = Math.max(2, Math.min(sc.speakers, personas.length));
      const speakers = sample(personas, need);
      let prev = docs.length ? docs[docs.length - 1] : null;
      for (const line of sc.lines) {
        if (t >= now - 30 * S || docs.length >= CAP) break;
        const sp = speakers[line.role % speakers.length];
        const hasM = line.mention && prev;
        const replyTo = line.reply && prev ? { authorName: prev.authorName, text: String(prev.text).slice(0, 140) } : undefined;
        docs.push(doc(group, sp, (hasM ? "@" + prev.authorName + " " : "") + line.text, { mentions: hasM ? [prev.authorName] : [], replyTo, at: new Date(t) }));
        prev = docs[docs.length - 1];
        t += rand(25 * S, 4 * M);
      }
      t += rand(2 * M, 12 * M);
    } else if (roll < 0.82) {                   // standalone line
      docs.push(doc(group, pick(personas), pick(LINES), { at: new Date(t) }));
      t += rand(3 * M, 15 * M);
    } else {                                    // payment-proof "screenshot"
      const p = makeProof(group, new Date(t));
      docs.push(doc(group, pick(personas), proofText(p), { proof: p, at: new Date(t), boost: true }));
      t += rand(5 * M, 22 * M);
    }
  }

  let inserted = 0;
  if (docs.length) {
    await ChatMessage.collection.insertMany(docs, { ordered: false }).catch(() => {});
    inserted = docs.length;
    // Bound room size so repeated fills don't grow it forever.
    const total = await ChatMessage.countDocuments({ group });
    if (total > KEEP + 200) {
      const cut = await ChatMessage.find({ group }).sort({ createdAt: -1 }).skip(KEEP).limit(1).select("createdAt");
      if (cut[0]) await ChatMessage.deleteMany({ group, createdAt: { $lt: cut[0].createdAt } }).catch(() => {});
    }
  }
  return inserted;
  } finally {
    // Always release the lock, even if generation/insert threw, so the room is
    // never stuck un-backfillable for the full lock window.
    await ChatState.updateOne({ group }, { $set: { backfillAt: null } }).catch(() => {});
  }
}

module.exports = { fillGap, makeProof, proofText };
