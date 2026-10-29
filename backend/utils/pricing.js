// Buying rate generator: slightly below original price, scaled to user balance.
// Latest-collection products yield larger profit %, picked by backend override when desired.
const LEVELS = require("../config/levels");

function levelFor(balance) {
  const ladder = LEVELS;
  let hit = ladder[0];
  for (const l of ladder) if (balance >= l.minBalance) hit = l;
  return hit;
}

function nextProductForUser(user, product) {
  const lvl = levelFor(user.balance);
  const basePct = product.isLatest ? lvl.latestPct : lvl.normalPct;
  const forced = user.analyst?.pendingForcedProfitPct;
  const profitPct = (forced !== null && forced !== undefined) ? forced : basePct;

  // Buying rate: small discount so profit % stays coherent with original.
  // salePrice ≈ original; profit = salePrice * profitPct/100 ; buyingRate = salePrice - profit, clamped by balance
  const salePrice = product.originalPrice;
  const profitAmount = +(salePrice * profitPct / 100).toFixed(2);
  const buyingRate = +(salePrice - profitAmount).toFixed(2);

  return { profitPct, profitAmount, salePrice, buyingRate, level: lvl };
}

module.exports = { levelFor, nextProductForUser };
