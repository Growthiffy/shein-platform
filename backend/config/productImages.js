// Category-matched product imagery. Keyword-based real photos from LoremFlickr
// so each product's picture actually matches its item type. `lock` makes a given
// product's image stable across reloads while varying between products.
const KEYWORDS = {
  Tie: "necktie,suit",
  Scarf: "silk,scarf",
  Handbag: "handbag,luxury",
  Watch: "wristwatch,luxury",
  Sunglasses: "sunglasses,fashion",
  Belt: "leather,belt",
  Dress: "dress,fashion",
  Jacket: "jacket,fashion",
  Sneakers: "sneakers,shoes",
  Perfume: "perfume,bottle",
};

function imageFor(name, lock = 1) {
  const kw = KEYWORDS[name] || "fashion,luxury";
  return `https://loremflickr.com/600/600/${encodeURIComponent(kw)}?lock=${lock}`;
}

module.exports = { KEYWORDS, imageFor };
