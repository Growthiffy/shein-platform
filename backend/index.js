require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "4mb" }));

const origins = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
const corsCheck = (origin, cb) => {
  if (!origin) return cb(null, true); // non-browser clients (curl, server-to-server)
  if (origins.includes(origin)) return cb(null, true);
  try {
    const h = new URL(origin).hostname;
    // Always trust localhost (dev) and the project's Vercel deployments.
    if (h === "localhost" || h === "127.0.0.1") return cb(null, true);
    if (h.endsWith(".vercel.app")) return cb(null, true);
  } catch {}
  cb(null, false);
};
app.use(cors({ origin: corsCheck, credentials: true }));

app.get("/health", (req, res) => res.json({ ok: true, service: "shein-backend" }));

app.get("/", (req, res) => {
  res.type("html").send(`<!doctype html><html><head><title>Shein API</title><style>
  body{font-family:system-ui;background:#0b0b0d;color:#f6f1e7;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6}
  h1{color:#e9d08b;font-family:Georgia,serif}
  code{background:#1a1a1d;padding:2px 6px;border-radius:4px;color:#e9d08b}
  a{color:#e9d08b}</style></head><body>
  <h1>Shein API</h1>
  <p>This is the backend API. Use the apps:</p>
  <ul>
    <li>Member site: <a href="https://shein-customer.vercel.app">shein-customer.vercel.app</a></li>
    <li>Admin: <a href="https://shein-dashboard-two.vercel.app">shein-dashboard-two.vercel.app</a></li>
  </ul>
  <p>Endpoints under <code>/api/*</code> (auth, me, analyst, wallet, invest, mentor, community, admin). Health: <code>/health</code>.</p>
  </body></html>`);
});

app.get("/api", (req, res) => res.json({
  service: "shein-backend", version: "1.0.0",
  endpoints: ["/api/auth/{signup,verify,login,resend}", "/api/me", "/api/analyst/{next,submit,history}", "/api/wallet/{deposit-addresses,deposit,withdraw,history}", "/api/invest/{tiers,start,release}", "/api/mentor", "/api/community/:group", "/api/admin/*"],
}));

// Ensure Mongo is connected before any /api/* route runs. Cached across invocations.
app.use("/api", async (req, res, next) => {
  try { await connectDB(); next(); } catch (e) { next(e); }
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth", authLimiter);

app.use("/api/auth",     require("./routes/auth"));
app.use("/api/me",       require("./routes/me"));
app.use("/api/analyst",  require("./routes/analyst"));
app.use("/api/wallet",   require("./routes/wallet"));
app.use("/api/invest",   require("./routes/invest"));
app.use("/api/mentor",   require("./routes/mentor"));
app.use("/api/community",require("./routes/community"));
app.use("/api/support",  require("./routes/support"));
app.use("/api/admin",    require("./routes/admin"));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "server error" });
});

module.exports = app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4001;
  connectDB().then(() => app.listen(PORT, () => console.log(`shein-backend on :${PORT}`)));
}
