require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Product = require("../models/Product");
const Mentor = require("../models/Mentor");
const DepositWallet = require("../models/DepositWallet");

const BRANDS = ["Vogue", "Gucci", "Zara", "Chanel", "Prada", "Dior", "Versace", "Louis Vuitton", "Burberry", "Hermes"];
const ITEMS  = ["Tie", "Scarf", "Handbag", "Watch", "Sunglasses", "Belt", "Dress", "Jacket", "Sneakers", "Perfume"];

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
        image: `https://picsum.photos/seed/shein-${i}/600/600`,
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

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
