require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Product = require("../models/Product");
const Mentor = require("../models/Mentor");
const DepositWallet = require("../models/DepositWallet");
const Setting = require("../models/Setting");
const Persona = require("../models/Persona");
const { DEFAULTS } = require("../utils/settings");
const { imageFor } = require("../config/productImages");

const BRANDS = ["Vogue", "Gucci", "Zara", "Chanel", "Prada", "Dior", "Versace", "Louis Vuitton", "Burberry", "Hermes"];
const ITEMS  = ["Tie", "Scarf", "Handbag", "Watch", "Sunglasses", "Belt", "Dress", "Jacket", "Sneakers", "Perfume"];
const { CATEGORIES, randomBrief } = require("../utils/analystContent");

async function main() {
  await connectDB();

  if (!(await User.findOne({ email: "admin@shein.local" }))) {
    await User.create({
      email: "admin@shein.local",
      passwordHash: await bcrypt.hash("admin123", 10),
      emailVerified: true, role: "admin", isAdmin: true,
      username: "admin", balance: 0, rewardCredit: 0,
    });
    console.log("admin created: admin@shein.local / admin123");
  }

  if ((await Product.estimatedDocumentCount()) === 0) {
    const docs = [];
    for (let i = 0; i < 60; i++) {
      const brand = BRANDS[i % BRANDS.length];
      const name = ITEMS[(i * 3) % ITEMS.length];
      docs.push({
        brand, name,
        originalPrice: 200 + ((i * 37) % 1800),
        isLatest: i % 5 === 0,
        image: imageFor(name, i + 1),
        category: CATEGORIES[i % CATEGORIES.length],
        marketBrief: randomBrief(),
      });
    }
    await Product.insertMany(docs);
    console.log("seeded products:", docs.length);
  }

  if ((await Mentor.estimatedDocumentCount()) === 0) {
    await Mentor.insertMany([
      { name: "Aria Chen",    title: "Portfolio Strategist", bio: "Luxury categories, 8 yrs." },
      { name: "Marco Rossi",  title: "Investment Coach",     bio: "Weekly compounding." },
      { name: "Sana Khan",    title: "Analyst Mentor",       bio: "Beginners welcome." },
      { name: "Hiro Tanaka",  title: "Latest-Collection Lead", bio: "High-% product picks." },
    ]);
    console.log("seeded mentors: 4");
  }

  if ((await DepositWallet.estimatedDocumentCount()) === 0) {
    await DepositWallet.insertMany([
      { chain: "USDT TRC20", address: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", label: "Primary" },
      { chain: "USDT BEP20", address: "0x0000000000000000000000000000000000000000", label: "Backup" },
    ]);
    console.log("seeded deposit wallets: 2");
  }

  // Settings — seed defaults only where the row is missing (idempotent).
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!(await Setting.findOne({ key }))) {
      await Setting.create({ key, value });
      console.log("seeded setting:", key, "=", value);
    }
  }

  // Personas — 22 AI community members across daily/invest/both.
  if ((await Persona.estimatedDocumentCount()) === 0) {
    const NAMES = [
      ["Aria", "Watch collector"], ["Marco", "FX trader"], ["Lena", "Handbag enthusiast"],
      ["Hiro", "Latest-collection fan"], ["Sana", "Weekend analyst"], ["Diego", "Long-term investor"],
      ["Mina", "Scarf specialist"], ["Omar", "Portfolio builder"], ["Yuki", "Sneaker hunter"],
      ["Nadia", "Steady saver"], ["Paulo", "Perfume reviewer"], ["Iris", "Tier climber"],
      ["Kofi", "Belt & accessories"], ["Elsa", "Daily grinder"], ["Raj", "Compounding fan"],
      ["Tara", "Dress curator"], ["Leo", "Early riser"], ["Noor", "Patient trader"],
      ["Sven", "Jacket reviewer"], ["Mara", "Sunglasses picks"], ["Ken", "Diamond-tier saver"],
      ["Zoe", "Community helper"],
    ];
    const docs = NAMES.map(([name, title], i) => ({
      name, title,
      avatar: `https://picsum.photos/seed/persona-${i}/200/200`,
      // Split roughly: first third daily, next third invest, rest both.
      group: i < 8 ? "daily" : i < 15 ? "invest" : "both",
      // Mix of repliers and broadcast-only members.
      canReply: i % 3 !== 0,
      active: true,
    }));
    await Persona.insertMany(docs);
    console.log("seeded personas:", docs.length);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
