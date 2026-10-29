import bcrypt from "bcryptjs";
import { exec, q, qOne, uid } from "@/lib/db";
import { ok, serverError, forbidden } from "@/lib/auth";

export const runtime = "nodejs";

const BRANDS = ["Vogue", "Gucci", "Zara", "Chanel", "Prada", "Dior", "Versace", "Louis Vuitton", "Burberry", "Hermes"];
const ITEMS  = ["Tie", "Scarf", "Handbag", "Watch", "Sunglasses", "Belt", "Dress", "Jacket", "Sneakers", "Perfume"];

export async function POST(req) {
  try {
    const token = req.headers.get("x-seed-token");
    if (token !== (process.env.SEED_TOKEN || "shein_seed_bootstrap")) return forbidden();

    const log = [];

    if (!(await qOne("SELECT id FROM users WHERE email = ?", ["admin@shein.local"]))) {
      const hash = await bcrypt.hash("admin123", 10);
      await exec("INSERT INTO users (id,email,password_hash,email_verified,is_admin,username,balance) VALUES (?,?,?,?,?,?,?)",
        [uid(), "admin@shein.local", hash, 1, 1, "admin", 0]);
      log.push("admin created: admin@shein.local / admin123");
    }

    const prodCount = (await q("SELECT COUNT(*) as c FROM products"))[0]?.c || 0;
    if (prodCount === 0) {
      for (let i = 0; i < 60; i++) {
        const brand = BRANDS[i % BRANDS.length];
        const name = ITEMS[(i * 3) % ITEMS.length];
        await exec("INSERT INTO products (id,brand,name,image,original_price,is_latest,active) VALUES (?,?,?,?,?,?,?)",
          [uid(), brand, name, `https://picsum.photos/seed/shein-${i}/600/600`, 200 + ((i * 37) % 1800), i % 5 === 0 ? 1 : 0, 1]);
      }
      log.push("seeded 60 products");
    }

    const mentorCount = (await q("SELECT COUNT(*) as c FROM mentors"))[0]?.c || 0;
    if (mentorCount === 0) {
      const list = [
        ["Aria Chen", "Portfolio Strategist", "Luxury categories, 8 yrs."],
        ["Marco Rossi", "Investment Coach", "Weekly compounding."],
        ["Sana Khan", "Analyst Mentor", "Beginners welcome."],
        ["Hiro Tanaka", "Latest-Collection Lead", "High-% product picks."],
      ];
      for (const [name, title, bio] of list) {
        await exec("INSERT INTO mentors (id,name,title,bio,active) VALUES (?,?,?,?,?)", [uid(), name, title, bio, 1]);
      }
      log.push("seeded 4 mentors");
    }

    const wCount = (await q("SELECT COUNT(*) as c FROM deposit_wallets"))[0]?.c || 0;
    if (wCount === 0) {
      await exec("INSERT INTO deposit_wallets (id,chain,address,label,active) VALUES (?,?,?,?,?)",
        [uid(), "USDT TRC20", "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", "Primary", 1]);
      await exec("INSERT INTO deposit_wallets (id,chain,address,label,active) VALUES (?,?,?,?,?)",
        [uid(), "USDT BEP20", "0x0000000000000000000000000000000000000000", "Backup", 1]);
      log.push("seeded 2 deposit wallets");
    }

    return ok({ ok: true, log });
  } catch (e) { return serverError(e.message); }
}
