import { createClient } from "@libsql/client";

let _client = null;
let _initPromise = null;

function url() {
  return process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
}

export function db() {
  if (!_client) {
    _client = createClient({
      url: url(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  email_verified INTEGER DEFAULT 0,
  verify_code TEXT,
  verify_expires INTEGER,
  balance REAL DEFAULT 0,
  reward_credit REAL DEFAULT 20,
  level TEXT DEFAULT 'beginner',
  daily_salary REAL DEFAULT 230,
  total_earned REAL DEFAULT 0,
  mentor_id TEXT,
  investment_tier INTEGER DEFAULT 0,
  investment_amount REAL DEFAULT 0,
  investment_started_at INTEGER,
  investment_lock_until INTEGER,
  investment_last_payout_at INTEGER,
  analyst_cycle_count INTEGER DEFAULT 0,
  analyst_pending_product_id TEXT,
  analyst_forced_pct REAL,
  is_admin INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000),
  updated_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS payout_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chain TEXT, address TEXT, label TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  original_price REAL NOT NULL,
  is_latest INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS mentors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT, bio TEXT, avatar TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS deposit_wallets (
  id TEXT PRIMARY KEY,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'complete',
  chain TEXT, address TEXT, tx_hash TEXT, note TEXT, slip_url TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS analyst_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  cycle_index INTEGER NOT NULL,
  buying_rate REAL NOT NULL,
  sale_price REAL NOT NULL,
  profit_pct REAL NOT NULL,
  profit_amount REAL NOT NULL,
  is_latest INTEGER DEFAULT 0,
  comment TEXT NOT NULL,
  status TEXT DEFAULT 'complete',
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  group_key TEXT NOT NULL,
  user_id TEXT,
  author_type TEXT DEFAULT 'user',
  author_name TEXT,
  author_avatar TEXT,
  text TEXT NOT NULL,
  can_reply INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_user ON analyst_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_group ON chat_messages(group_key, created_at DESC);
`;

export async function ensureSchema() {
  if (!_initPromise) {
    _initPromise = (async () => {
      const c = db();
      const stmts = SCHEMA.split(/;\s*(?=CREATE|INSERT|UPDATE|DELETE|--)/i).map(s => s.trim()).filter(Boolean);
      for (const s of stmts) await c.execute(s);
    })();
  }
  return _initPromise;
}

export async function q(sql, args = []) {
  await ensureSchema();
  const res = await db().execute({ sql, args });
  return res.rows;
}

export async function qOne(sql, args = []) {
  const rows = await q(sql, args);
  return rows[0] || null;
}

export async function exec(sql, args = []) {
  await ensureSchema();
  return db().execute({ sql, args });
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
