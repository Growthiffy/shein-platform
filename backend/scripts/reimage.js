// One-off/repeatable: repoint every existing product's `image` at the curated
// imagery in config/productImages.js. Picks a stable photo per product by
// hashing its _id, so the same product keeps the same image across runs.
//   node scripts/reimage.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { imageFor, IMAGES } = require("../config/productImages");

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h >>> 0; }

(async () => {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI not set"); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find();
  const unmatched = {};
  let updated = 0;
  for (const p of products) {
    if (!IMAGES[p.name]) unmatched[p.name] = (unmatched[p.name] || 0) + 1;
    const next = imageFor(p.name, hash(String(p._id)));
    if (p.image !== next) { p.image = next; await p.save(); updated++; }
  }
  console.log(`products: ${products.length}, updated: ${updated}`);
  if (Object.keys(unmatched).length) console.log("names without a curated set (used fallback):", unmatched);
  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
