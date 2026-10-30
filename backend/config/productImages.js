// Curated, hand-verified product imagery (Unsplash CDN). Each item type has a
// few clean studio/product photos, visually checked and confirmed reachable.
// imageFor rotates by `lock` for variety while staying stable per product.
const U = id => `https://images.unsplash.com/photo-${id}?w=700&q=80&auto=format&fit=crop`;

const IMAGES = {
  Sunglasses: ["1732139637224-95da5661d5ed", "1572635196237-14b3f281503f", "1649119161997-00ffc8c24e11", "1584036553516-bf83210aa16c"].map(U),
  Watch:      ["1783423030846-bfe0fd6beee1", "1732246449812-322e6ef728f9", "1523275335684-37898b6baf30", "1737731662588-729f42147158"].map(U),
  Handbag:    ["1637069422643-9b6d41d51dd9", "1645276241987-7a7c14bf88f9"].map(U),
  Dress:      ["1595777457583-95e059d581b8", "1566174053879-31528523f8ae", "1631233835809-bd80a70f3491"].map(U),
  Jacket:     ["1727519366940-fd9b926e362e", "1708523842501-1619478cea1f", "1778395469141-8d70d501bbd7"].map(U),
  Sneakers:   ["1695073621086-aa692bc32a3d", "1600269452121-4f2416e55c28", "1608231387042-66d1773070a5"].map(U),
  Belt:       ["1664286074176-5206ee5dc878", "1711443982852-b3df5c563448", "1631160246898-58192f971b5f"].map(U),
  Perfume:    ["1633072437275-ec3344b4b966", "1638551442447-085a2d42918f", "1698877577733-65ae7dee328c"].map(U),
  Scarf:      ["1652385748879-cd7a0cdf466c", "1652385912672-e7cc94d0721d", "1573231971438-ed0790ba3cbb"].map(U),
  Tie:        ["1612241530200-cd98ad2c4a6a", "1610652492500-ded49ceeb378", "1486148507453-dea24be2a9c0"].map(U),
};
const FALLBACK = IMAGES.Handbag;

function imageFor(name, lock = 1) {
  const list = IMAGES[name] || FALLBACK;
  return list[Math.abs(lock) % list.length];
}

module.exports = { IMAGES, imageFor };
