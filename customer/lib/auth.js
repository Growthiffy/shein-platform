import jwt from "jsonwebtoken";
import { qOne } from "./db";

function secret() {
  return process.env.JWT_SECRET || "dev_shein_secret_change_me";
}

export function sign(user) {
  return jwt.sign({ id: user.id }, secret(), { expiresIn: "30d" });
}

export function verify(token) {
  try { return jwt.verify(token, secret()); } catch { return null; }
}

export async function userFromRequest(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  const data = verify(token);
  if (!data) return null;
  const u = await qOne("SELECT * FROM users WHERE id = ?", [data.id]);
  return u;
}

export function unauth() { return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } }); }
export function forbidden() { return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } }); }
export function badReq(msg) { return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { "Content-Type": "application/json" } }); }
export function ok(data) { return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } }); }
export function serverError(msg) { return new Response(JSON.stringify({ error: msg || "server error" }), { status: 500, headers: { "Content-Type": "application/json" } }); }
