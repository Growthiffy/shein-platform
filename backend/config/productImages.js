// Category-matched product imagery from the Unsplash CDN (verified reachable).
// Each item type has a few photos; imageFor rotates by `lock` for variety while
// staying stable per product.
const U = id => `https://images.unsplash.com/photo-${id}?w=700&q=80&auto=format&fit=crop`;

const IMAGES = {
  Sunglasses: ["1511499767150-a48a237f0083", "1577803645773-f96470509666", "1572635196237-14b3f281503f"].map(U),
  Watch:      ["1523275335684-37898b6baf30", "1587836374828-4dbafa94cf0e", "1548171915-e79a380a2a4b"].map(U),
  Handbag:    ["1584917865442-de89df76afd3", "1548036328-c9fa89d128fa", "1594223274512-ad4803739b7c"].map(U),
  Dress:      ["1595777457583-95e059d581b8", "1566174053879-31528523f8ae", "1572804013309-59a88b7e92f1"].map(U),
  Jacket:     ["1551028719-00167b16eac5", "1520975916090-3105956dac38", "1591047139829-d91aecb6caea"].map(U),
  Sneakers:   ["1542291026-7eec264c27ff", "1600185365926-3a2ce3cdb9eb", "1595950653106-6c9ebd614d3a"].map(U),
  Belt:       ["1553062407-98eeb64c6a62", "1624222247344-550fb60583dc", "1611010344444-5f9e4d86a6e1"].map(U),
  Perfume:    ["1541643600914-78b084683601", "1594035910387-fea47794261f"].map(U),
  Scarf:      ["1601924994987-69e26d50dc26", "1520903920243-00d872a2d1c9", "1584030373081-f37b7bb4fa8e"].map(U),
  Tie:        ["1589810635657-232948472d98", "1624378439575-d8705ad7ae80", "1593032465175-481ac7f401a0"].map(U),
};
const FALLBACK = IMAGES.Handbag;

function imageFor(name, lock = 1) {
  const list = IMAGES[name] || FALLBACK;
  return list[Math.abs(lock) % list.length];
}

module.exports = { IMAGES, imageFor };
