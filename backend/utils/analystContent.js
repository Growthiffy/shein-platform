// Content + validation helpers that make analyst submissions feel like real work.
const { generate, aiEnabled } = require("./ai");

const CATEGORIES = ["fashion", "electronics", "home", "beauty", "accessories", "sports"];

// Static market-brief pool, assigned randomly when a product has none. Admins can
// edit a product's brief; AI can also generate one when a key is configured.
const BRIEFS = [
  "Strong Q4 demand projected. Competitor pricing ranges $850-$1,100. Social sentiment trending positive. Supply chain stable.",
  "Seasonal interest rising ahead of holiday period. Limited competitor stock creates a pricing window. Margins healthy.",
  "Mature category with steady repeat demand. Price elasticity low. Recommend maintaining inventory depth.",
  "Emerging micro-trend driven by social video. Early-mover advantage likely. Watch for rapid saturation.",
  "Premium positioning holding firm. Resale values strong. Brand equity supports above-market pricing.",
  "Demand softening month-over-month. Competitor discounting observed. Monitor before restocking.",
  "High velocity, thin margin. Volume strategy favored over markup. Logistics cost is the key variable.",
  "Regional demand concentrated in urban markets. Cross-border shipping adds 6-9 days. Returns rate average.",
  "New collection outperforming last season by double digits. Latest-tier commission reflects momentum.",
  "Stable staple with predictable turnover. Low risk, modest upside. Good baseline inventory candidate.",
  "Price-sensitive segment. Small discounts drive outsized conversion. Bundle opportunities exist.",
  "Supply tightening upstream. Expect cost pressure next quarter. Lock pricing where possible.",
  "Influencer-led spike cooling to a sustainable floor. Long-tail demand expected through spring.",
  "Competitive set crowded. Differentiation on quality perception rather than price is advised.",
  "Underpriced versus comparable listings. Room to raise sale price without denting conversion.",
];

function randomCategory() { return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]; }
function randomBrief() { return BRIEFS[Math.floor(Math.random() * BRIEFS.length)]; }

// Lazily fill category + market brief on products that predate these fields, so
// old documents work with no migration. AI generates the brief when available,
// otherwise a random static one is used. Mutates + saves the product.
async function ensureProductMeta(product) {
  let changed = false;
  if (!product.category) { product.category = randomCategory(); changed = true; }
  if (!product.marketBrief) {
    let brief = null;
    if (aiEnabled()) {
      brief = await generate(
        `Write a 2-3 sentence market brief for a product analyst reviewing "${product.brand} ${product.name}" (${product.category}). Mention demand, competitor pricing and one risk or opportunity. No preamble.`,
        { maxTokens: 90, temperature: 0.8, cacheKey: `brief:${product._id}` }
      );
    }
    product.marketBrief = brief || randomBrief();
    changed = true;
  }
  if (changed) await product.save().catch(() => {});
  return product;
}

const GARBAGE = new Set([
  "good product", "good", "nice", "ok", "okay", "test", "testing", "asdf", "qwerty",
  "cool", "great", "fine", "yes", "no", "idk", "n/a", "na", "...", "abc", "aaa",
]);

// Returns null if the comment passes, or an error string to reject with.
function validateComment(raw) {
  const comment = String(raw || "").trim();
  if (comment.length < 50) {
    return "Analysis does not meet minimum quality standards. Please provide detailed market observations.";
  }
  const lower = comment.toLowerCase();
  // All the same character (ignoring spaces).
  const noSpace = lower.replace(/\s+/g, "");
  if (noSpace.length && /^(.)\1*$/.test(noSpace)) {
    return "Low-quality analysis rejected. Provide specific observations about market positioning, demand trends, or pricing strategy.";
  }
  const words = lower.match(/[a-z0-9']+/g) || [];
  const unique = new Set(words);
  if (unique.size < 3) {
    return "Low-quality analysis rejected. Provide specific observations about market positioning, demand trends, or pricing strategy.";
  }
  if (GARBAGE.has(lower)) {
    return "Low-quality analysis rejected. Provide specific observations about market positioning, demand trends, or pricing strategy.";
  }
  return null;
}

// Cosmetic 72-96 AI quality score. Not used for any logic.
function qualityScore() { return 72 + Math.floor(Math.random() * 25); }

module.exports = { ensureProductMeta, validateComment, qualityScore, randomCategory, randomBrief, CATEGORIES };
