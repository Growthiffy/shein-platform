// Replace every product's image with a category-matched real photo based on its
// item name, so analyst products show the right kind of item. Idempotent.
require("dotenv").config();
const connectDB = require("../config/db");
const Product = require("../models/Product");
const { imageFor } = require("../config/productImages");

async function main() {
  await connectDB();
  const products = await Product.find();
  let n = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    p.image = imageFor(p.name, i + 1);
    await p.save();
    n++;
  }
  console.log("reimaged products:", n);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
