import { userFromRequest, unauth, ok, serverError } from "@/lib/auth";
import { exec, q, qOne } from "@/lib/db";
import { quoteFor, PRODUCTS_PER_CYCLE } from "@/lib/business";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    if (u.analyst_cycle_count >= PRODUCTS_PER_CYCLE) return ok({ done: true, cycleCount: u.analyst_cycle_count });

    let product = null;
    if (u.analyst_pending_product_id) product = await qOne("SELECT * FROM products WHERE id=?", [u.analyst_pending_product_id]);
    if (!product) {
      const rows = await q("SELECT * FROM products WHERE active = 1 ORDER BY RANDOM() LIMIT 1");
      if (!rows.length) return new Response(JSON.stringify({ error: "no products" }), { status: 503, headers: { "Content-Type": "application/json" } });
      product = rows[0];
      await exec("UPDATE users SET analyst_pending_product_id=? WHERE id=?", [product.id, u.id]);
    }
    const quote = quoteFor(u, product);
    return ok({
      cycleIndex: u.analyst_cycle_count + 1,
      product: { id: product.id, brand: product.brand, name: product.name, image: product.image, originalPrice: product.original_price, isLatest: !!product.is_latest },
      quote: { profitPct: quote.profitPct, profitAmount: quote.profitAmount, salePrice: quote.salePrice, buyingRate: quote.buyingRate },
      remaining: PRODUCTS_PER_CYCLE - u.analyst_cycle_count,
    });
  } catch (e) { return serverError(e.message); }
}
