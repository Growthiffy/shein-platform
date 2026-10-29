import { userFromRequest, unauth, ok, badReq, serverError } from "@/lib/auth";
import { exec, qOne, uid } from "@/lib/db";
import { quoteFor } from "@/lib/business";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const u = await userFromRequest(req); if (!u) return unauth();
    const { comment } = await req.json();
    if (!comment || !comment.trim()) return badReq("comment required");
    if (!u.analyst_pending_product_id) return badReq("no active product");
    const product = await qOne("SELECT * FROM products WHERE id=?", [u.analyst_pending_product_id]);
    if (!product) return badReq("product gone");

    const quote = quoteFor(u, product);
    const subId = uid();
    const cycleIndex = u.analyst_cycle_count + 1;
    await exec(
      "INSERT INTO analyst_submissions (id,user_id,product_id,cycle_index,buying_rate,sale_price,profit_pct,profit_amount,is_latest,comment,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [subId, u.id, product.id, cycleIndex, quote.buyingRate, quote.salePrice, quote.profitPct, quote.profitAmount, product.is_latest ? 1 : 0, comment.trim(), "complete"]
    );
    const newBal = +(u.balance + quote.profitAmount).toFixed(2);
    const newEarn = +(u.total_earned + quote.profitAmount).toFixed(2);
    await exec(
      "UPDATE users SET balance=?, total_earned=?, analyst_cycle_count=analyst_cycle_count+1, analyst_pending_product_id=NULL, analyst_forced_pct=NULL WHERE id=?",
      [newBal, newEarn, u.id]
    );
    await exec("INSERT INTO transactions (id,user_id,type,amount,note) VALUES (?,?,?,?,?)",
      [uid(), u.id, "commission", quote.profitAmount, `Product ${product.brand} ${product.name}`]);
    return ok({ ok: true, balance: newBal, cycleCount: cycleIndex });
  } catch (e) { return serverError(e.message); }
}
