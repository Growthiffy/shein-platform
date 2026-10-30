// Top up the AI community personas to a target count (default 400) using the
// weighted fake-identity pool (real-looking faces, US/UK/CA-heavy mix). Idempotent:
// run as many times as you like; it only adds what's missing and never deletes.
//
//   node scripts/seedPersonas.js [target]
require("dotenv").config();
const connectDB = require("../config/db");
const Persona = require("../models/Persona");
const { pool } = require("../utils/fakeIdentities");

const TITLES = [
  "Watch collector", "FX trader", "Handbag enthusiast", "Latest-collection fan",
  "Weekend analyst", "Long-term investor", "Scarf specialist", "Portfolio builder",
  "Sneaker hunter", "Steady saver", "Perfume reviewer", "Tier climber",
  "Belt & accessories", "Daily grinder", "Compounding fan", "Dress curator",
  "Early riser", "Patient trader", "Jacket reviewer", "Sunglasses picks",
  "Diamond-tier saver", "Community helper", "Momentum trader", "Value hunter",
];

async function main() {
  const target = Math.max(1, Number(process.argv[2]) || 400);
  await connectDB();

  const existing = await Persona.find().select("name");
  const have = new Set(existing.map(p => p.name));
  const need = target - existing.length;
  if (need <= 0) { console.log(`already ${existing.length} personas (>= ${target}); nothing to add`); process.exit(0); }

  const people = pool();
  const docs = [];
  let i = 0;
  for (const p of people) {
    if (docs.length >= need) break;
    if (have.has(p.name)) continue;      // skip duplicates by display name
    have.add(p.name);
    const n = i++;
    docs.push({
      name: p.name,
      title: TITLES[n % TITLES.length],
      avatar: p.avatar,
      // Spread across rooms: ~⅓ daily, ⅓ invest, ⅓ both.
      group: n % 3 === 0 ? "daily" : n % 3 === 1 ? "invest" : "both",
      canReply: n % 4 !== 0,            // most invite replies
      active: true,
    });
  }
  if (docs.length) await Persona.insertMany(docs);
  const total = await Persona.estimatedDocumentCount();
  console.log(`added ${docs.length} personas; total now ${total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
