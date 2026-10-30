// End-to-end smoke/integration test. Boots the real Express app against a fresh,
// isolated test database (a unique db on the same cluster, dropped at the end),
// seeds minimal data, and drives the public + admin APIs over HTTP, asserting the
// key features and the security/money-integrity fixes. Run: node scripts/e2e.js
require("dotenv").config();
process.env.NODE_ENV = "test";
delete process.env.VERCEL;                 // ensure dev behaviour (devCode returned)
const PORT = process.env.E2E_PORT || 4999;
process.env.PORT = PORT;

// Point at an isolated throwaway db on the same cluster.
const base = process.env.MONGO_URI;
if (!base) { console.error("MONGO_URI missing"); process.exit(1); }
const dbName = "shein_e2e_" + Date.now();
process.env.MONGO_URI = base.replace(/(mongodb(?:\+srv)?:\/\/[^/]+\/)[^?]*/, `$1${dbName}`);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { authenticator } = require("otplib");

let pass = 0, fail = 0;
const results = [];
function ok(name, cond, extra) { (cond ? pass++ : fail++); results.push(`${cond ? "PASS" : "FAIL"}  ${name}${cond || extra === undefined ? "" : "  -> " + extra}`); }

const BASE = `http://localhost:${PORT}`;
async function req(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  require("../index");                     // boots connect + listen
  // Wait for health.
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + "/health"); if (r.ok) break; } catch {} await sleep(200); }

  const User = require("../models/User");
  const Product = require("../models/Product");
  const Persona = require("../models/Persona");
  const Mentor = require("../models/Mentor");
  const ChatMessage = require("../models/ChatMessage");
  const { imageFor, IMAGES } = require("../config/productImages");

  // ---- seed ----
  const items = ["Tie", "Watch", "Handbag", "Dress", "Sneakers", "Belt"];
  await Product.insertMany(items.map((n, i) => ({ brand: "Gucci", name: n, originalPrice: 500 + i * 100, isLatest: i === 0, active: true, image: imageFor(n, i) })));
  await Persona.insertMany([
    { name: "Leo", group: "both", active: true },
    { name: "Mara", group: "both", active: true },
    { name: "Noor", group: "both", active: true },
  ]);

  try {
    // ================= AUTH =================
    let r = await req("POST", "/api/auth/signup", { body: { email: "alice@test.com", password: "password123" } });
    ok("signup returns devCode (dev)", r.status === 200 && !!r.json.devCode, JSON.stringify(r.json));
    const code = r.json.devCode;
    r = await req("POST", "/api/auth/verify", { body: { email: "alice@test.com", code } });
    ok("verify returns token", r.status === 200 && !!r.json.token);
    let token = r.json.token;
    ok("verify -> basic level + signup reward in balance", r.json.user?.verification?.level === "basic" && r.json.user?.balance > 0);

    r = await req("POST", "/api/auth/login", { body: { email: "alice@test.com", password: "wrong" } });
    ok("login wrong password -> 401", r.status === 401);
    r = await req("POST", "/api/auth/login", { body: { email: "alice@test.com", password: "password123" } });
    ok("login correct -> token", r.status === 200 && !!r.json.token);
    token = r.json.token;

    // ================= 2FA (bypass fix) =================
    r = await req("POST", "/api/me/2fa/setup", { token });
    const secret = r.json.secret;
    ok("2fa setup returns secret", !!secret);
    r = await req("POST", "/api/me/2fa/enable", { token, body: { token: authenticator.generate(secret) } });
    ok("2fa enable ok", r.status === 200);
    r = await req("POST", "/api/auth/login", { body: { email: "alice@test.com", password: "password123" } });
    ok("login without 2FA code -> 401 needs2FA", r.status === 401 && r.json.needs2FA === true);
    r = await req("POST", "/api/auth/login", { body: { email: "alice@test.com", password: "password123", token: authenticator.generate(secret) } });
    ok("login with valid 2FA code -> token", r.status === 200 && !!r.json.token);
    token = r.json.token;

    // Give Alice a balance for money tests.
    await User.updateOne({ email: "alice@test.com" }, { $set: { balance: 20000, "verification.level": "standard" } });

    // ================= ANALYST (double-submit race) =================
    r = await req("GET", "/api/analyst/next", { token });
    ok("analyst/next returns product", r.status === 200 && !!r.json.product?.id);
    const sub = { comment: "Strong demand signals, pricing is competitive versus peers and quality looks solid for the tier.", demandRating: 4, qualityRating: 5, priceRating: 3, recommendation: "stock_more" };
    const [s1, s2] = await Promise.all([
      req("POST", "/api/analyst/submit", { token, body: sub }),
      req("POST", "/api/analyst/submit", { token, body: sub }),
    ]);
    const submitOk = [s1, s2].filter(x => x.status === 200).length;
    const submitRej = [s1, s2].filter(x => x.status === 400).length;
    ok("analyst concurrent submit -> exactly one credited", submitOk === 1 && submitRej === 1, `ok=${submitOk} rej=${submitRej}`);

    // ================= WALLET (hold + race + NaN) =================
    r = await req("POST", "/api/wallet/withdraw", { token, body: { amount: 100, chain: "TRC20", address: "TnotSaved123" } });
    ok("withdraw to unsaved address -> 400", r.status === 400, JSON.stringify(r.json));
    r = await req("POST", "/api/wallet/withdraw", { token, body: { amount: "abc", chain: "TRC20", address: "TnotSaved123" } });
    ok("withdraw NaN amount -> 400", r.status === 400);
    await req("POST", "/api/me/payout-wallet", { token, body: { chain: "TRC20", address: "Tsaved999", label: "main" } });
    r = await req("POST", "/api/wallet/withdraw", { token, body: { amount: 100, chain: "TRC20", address: "Tsaved999" } });
    ok("withdraw to held (new) address -> 400 hold", r.status === 400 && /hold/i.test(r.json.error || ""));
    // clear the hold
    await User.updateOne({ email: "alice@test.com" }, { $set: { "payoutWallets.$[].active": true } });
    const before = (await User.findOne({ email: "alice@test.com" })).balance;
    const w = await Promise.all([
      req("POST", "/api/wallet/withdraw", { token, body: { amount: 15000, chain: "TRC20", address: "Tsaved999" } }),
      req("POST", "/api/wallet/withdraw", { token, body: { amount: 15000, chain: "TRC20", address: "Tsaved999" } }),
    ]);
    const wOk = w.filter(x => x.status === 200).length;
    const after = (await User.findOne({ email: "alice@test.com" })).balance;
    ok("withdraw concurrent -> no overdraw (one succeeds, balance >= 0)", wOk === 1 && after >= 0, `wOk=${wOk} after=${after}`);

    // ================= INVEST (overwrite + double-release) =================
    await User.updateOne({ email: "alice@test.com" }, { $set: { balance: 20000, investment: { tier: 0, amount: 0 } } });
    r = await req("POST", "/api/invest/start", { token, body: { tierLevel: 1, amount: 1000 } });
    ok("invest start ok", r.status === 200 && r.json.investment?.amount === 1000);
    r = await req("POST", "/api/invest/start", { token, body: { tierLevel: 2, amount: 2500 } });
    ok("invest start while active -> 400 (no overwrite)", r.status === 400);
    // unlock + double release
    await User.updateOne({ email: "alice@test.com" }, { $set: { "investment.lockUntil": new Date(Date.now() - 1000) } });
    const rel = await Promise.all([
      req("POST", "/api/invest/release", { token }),
      req("POST", "/api/invest/release", { token }),
    ]);
    const relOk = rel.filter(x => x.status === 200).length;
    ok("invest concurrent release -> exactly one", relOk === 1, `relOk=${relOk}`);

    // ================= COMMUNITY (backfill + proof) =================
    r = await req("GET", "/api/community/daily", { token });
    ok("community GET ok", r.status === 200 && Array.isArray(r.json.items));
    // make the room look stale, then reload -> backfill
    const oldest = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    // Raw driver: createdAt is immutable under Mongoose timestamps, so bypass it.
    await ChatMessage.collection.updateMany({ group: "daily" }, { $set: { createdAt: oldest, updatedAt: oldest } });
    const cntBefore = await ChatMessage.countDocuments({ group: "daily" });
    await req("GET", "/api/community/daily", { token });
    await sleep(300);
    const cntAfter = await ChatMessage.countDocuments({ group: "daily" });
    ok("community backfill after gap inserts many", cntAfter - cntBefore > 50, `+${cntAfter - cntBefore}`);
    const proofCount = await ChatMessage.countDocuments({ group: "daily", "proof.kind": { $ne: null } });
    ok("community has payment-proof posts", proofCount > 0, `proofs=${proofCount}`);
    r = await req("POST", "/api/community/daily", { token, body: { text: "hey everyone, new here!" } });
    ok("community post message ok", r.status === 200 && !!r.json.msg);

    // ================= ADMIN RBAC + mentor-admin =================
    const owner = await User.create({ username: "owner", passwordHash: await bcrypt.hash("password123", 10), role: "admin", isAdmin: true, emailVerified: true, permissions: [] });
    const limited = await User.create({ username: "limited", passwordHash: await bcrypt.hash("password123", 10), role: "admin", isAdmin: true, emailVerified: true, permissions: ["support"] });
    const jwt = require("jsonwebtoken");
    const sign = u => jwt.sign({ id: u._id.toString(), tv: 0 }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const ownerTok = sign(owner), limitedTok = sign(limited);
    r = await req("GET", "/api/admin/admins", { token: limitedTok });
    ok("limited admin blocked from /admins (owner only)", r.status === 403);
    r = await req("GET", "/api/admin/admins", { token: ownerTok });
    ok("owner lists admins", r.status === 200 && Array.isArray(r.json.items));
    r = await req("GET", "/api/admin/users", { token: limitedTok });
    ok("limited admin blocked from members (no perm)", r.status === 403);

    // make limited a mentor, assign alice, chat
    r = await req("PATCH", `/api/admin/admins/${limited._id}/mentor`, { token: ownerTok, body: { enabled: true, name: "Coach Lee", title: "Mentor" } });
    ok("owner promotes admin to mentor", r.status === 200 && !!r.json.mentor?._id);
    const mentorId = r.json.mentor._id;
    const alice = await User.findOne({ email: "alice@test.com" });
    await User.updateOne({ _id: alice._id }, { $set: { mentor: mentorId } });
    r = await req("GET", "/api/mentor-admin/me", { token: limitedTok });
    ok("mentor-admin/me returns mentor", r.status === 200 && r.json.mentor?._id === String(mentorId));
    r = await req("GET", "/api/mentor-admin/mentees", { token: limitedTok });
    ok("mentor-admin/mentees lists assigned member", r.status === 200 && r.json.items?.some(m => m._id === String(alice._id)));
    r = await req("POST", `/api/mentor-admin/room/${alice._id}`, { token: limitedTok, body: { text: "welcome, let's grow your portfolio" } });
    ok("mentor posts to mentee room as mentor", r.status === 200 && r.json.msg?.authorType === "mentor");
    // member can open own room, not another's
    r = await req("GET", `/api/community/mentor:${mentorId}:${alice._id}`, { token });
    ok("member opens own mentor room", r.status === 200 && r.json.items?.length > 0);
    r = await req("GET", `/api/community/mentor:${mentorId}:000000000000000000000000`, { token });
    ok("member cannot open another's mentor room -> 403", r.status === 403);

    // presence mutes personas
    await req("POST", "/api/mentor-admin/presence", { token: limitedTok, body: { group: "daily", typing: true } });
    r = await req("GET", "/api/community/daily", { token });
    ok("human presence surfaces in typing", Array.isArray(r.json.typing));

    // ================= GAMIFICATION / SOCIAL =================
    r = await req("GET", "/api/stats/payouts-ticker", { token });
    ok("payouts ticker returns items with text", r.status === 200 && r.json.items?.length > 5 && !!r.json.items[0].text);
    r = await req("GET", "/api/stats/leaderboard", { token });
    ok("leaderboard returns ranked items + your rank", r.status === 200 && r.json.items?.[0]?.rank === 1 && typeof r.json.you?.rank === "number");

    r = await req("GET", "/api/me/achievements", { token });
    ok("achievements list derived (verified unlocked)", r.status === 200 && r.json.items?.find(a => a.key === "verified")?.done === true);

    r = await req("POST", "/api/me/checkin", { token });
    ok("checkin day 1 credits a reward", r.status === 200 && r.json.already === false && r.json.reward > 0 && r.json.streak === 1);
    r = await req("POST", "/api/me/checkin", { token });
    ok("second checkin same day -> already", r.status === 200 && r.json.already === true);

    // share a real transaction as a community proof
    r = await req("POST", "/api/community/daily/share-proof", { token, body: { kind: "withdrawal" } });
    ok("member shares real withdrawal proof -> user post with proof", r.status === 200 && r.json.msg?.authorType === "user" && r.json.msg?.proof?.kind === "withdrawal");
    r = await req("POST", "/api/community/daily/share-proof", { token, body: { kind: "invest" } });
    ok("member shares real invest proof", r.status === 200 && r.json.msg?.proof?.kind === "invest");

    // ================= ADMIN MEMBER MANAGEMENT =================
    // Throwaway member for destructive ops.
    r = await req("POST", "/api/auth/signup", { body: { email: "victim@test.com", password: "password123" } });
    r = await req("POST", "/api/auth/verify", { body: { email: "victim@test.com", code: r.json.devCode } });
    let victimTok = r.json.token;
    const victim = await User.findOne({ email: "victim@test.com" });

    r = await req("GET", `/api/admin/users/${victim._id}`, { token: ownerTok });
    ok("admin member detail returns user + related", r.status === 200 && r.json.user?.email === "victim@test.com" && Array.isArray(r.json.transactions));

    r = await req("PATCH", `/api/admin/users/${victim._id}`, { token: ownerTok, body: { balance: 777, creditScore: 60, level: "gold" } });
    ok("admin edits member fields", r.status === 200 && r.json.user?.balance === 777 && r.json.user?.creditScore === 60);
    r = await req("PATCH", `/api/admin/users/${victim._id}`, { token: ownerTok, body: { email: "alice@test.com" } });
    ok("admin edit rejects duplicate email -> 409", r.status === 409);

    r = await req("POST", `/api/admin/users/${victim._id}/verification`, { token: ownerTok, body: { level: "premium", country: "UK" } });
    ok("admin sets verification level", r.status === 200 && r.json.user?.verification?.level === "premium");

    r = await req("POST", `/api/admin/users/${victim._id}/investment`, { token: ownerTok, body: { tier: 3, amount: 5000 } });
    ok("admin sets member investment", r.status === 200 && r.json.user?.investment?.amount === 5000);

    r = await req("POST", `/api/admin/users/${victim._id}/login-as`, { token: ownerTok });
    ok("admin login-as returns a member token", r.status === 200 && !!r.json.token);
    const asToken = r.json.token;
    r = await req("GET", "/api/me", { token: asToken });
    ok("login-as token acts as the member", r.status === 200 && r.json.user?.email === "victim@test.com");

    // password reset invalidates old sessions
    r = await req("POST", `/api/admin/users/${victim._id}/password`, { token: ownerTok, body: { password: "newpass1234" } });
    ok("admin resets member password", r.status === 200);
    r = await req("GET", "/api/me", { token: victimTok });
    ok("old session invalid after password reset", r.status === 401);
    r = await req("POST", "/api/auth/login", { body: { email: "victim@test.com", password: "newpass1234" } });
    ok("member logs in with admin-set password", r.status === 200 && !!r.json.token);
    victimTok = r.json.token;

    // suspend blocks access
    r = await req("POST", `/api/admin/users/${victim._id}/suspend`, { token: ownerTok, body: { suspended: true, reason: "fraud review" } });
    ok("admin suspends member", r.status === 200 && r.json.user?.suspended === true);
    // old token is also invalidated (tokenVersion bumped) -> 401; a fresh token hits the suspended gate -> 403.
    r = await req("GET", "/api/me", { token: victimTok });
    ok("suspended member old session invalid", r.status === 401 || r.status === 403);
    const freshSuspended = (await req("POST", `/api/admin/users/${victim._id}/login-as`, { token: ownerTok })).json.token;
    r = await req("GET", "/api/me", { token: freshSuspended });
    ok("suspended member blocked from API -> 403", r.status === 403 && r.json.suspended === true);
    r = await req("POST", "/api/auth/login", { body: { email: "victim@test.com", password: "newpass1234" } });
    ok("suspended member blocked from login -> 403", r.status === 403);
    r = await req("POST", `/api/admin/users/${victim._id}/suspend`, { token: ownerTok, body: { suspended: false } });
    ok("admin unsuspends member", r.status === 200 && r.json.user?.suspended === false);

    r = await req("POST", `/api/admin/users/${victim._id}/2fa-disable`, { token: ownerTok });
    ok("admin disables member 2FA", r.status === 200);

    // deleting your own admin account is blocked
    r = await req("DELETE", `/api/admin/users/${owner._id}`, { token: ownerTok });
    ok("admin cannot delete self -> 400", r.status === 400);
    r = await req("DELETE", `/api/admin/users/${victim._id}`, { token: ownerTok });
    ok("admin deletes member", r.status === 200 && r.json.ok === true);
    ok("deleted member is gone", !(await User.findById(victim._id)));

    // limited admin (no members perm) cannot manage members
    r = await req("DELETE", `/api/admin/users/${alice._id}`, { token: limitedTok });
    ok("non-members-perm admin blocked from delete -> 403", r.status === 403);

  } catch (e) {
    ok("suite ran without throwing", false, e.message + "\n" + e.stack);
  }

  // ---- report ----
  console.log("\n================ E2E RESULTS ================");
  results.forEach(l => console.log(l));
  console.log(`\n${pass} passed, ${fail} failed`);

  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  process.exit(fail ? 1 : 0);
})();
