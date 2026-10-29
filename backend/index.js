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
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth", authLimiter);

app.get("/health", (req, res) => res.json({ ok: true, service: "shein-backend" }));

app.use("/api/auth",     require("./routes/auth"));
app.use("/api/me",       require("./routes/me"));
app.use("/api/analyst",  require("./routes/analyst"));
app.use("/api/wallet",   require("./routes/wallet"));
app.use("/api/invest",   require("./routes/invest"));
app.use("/api/mentor",   require("./routes/mentor"));
app.use("/api/community",require("./routes/community"));
app.use("/api/admin",    require("./routes/admin"));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "server error" });
});

const PORT = process.env.PORT || 4001;
connectDB().then(() => app.listen(PORT, () => console.log(`shein-backend on :${PORT}`)));
