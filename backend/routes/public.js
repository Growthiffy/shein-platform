const router = require("express").Router();
const { getSettings } = require("../utils/settings");
const Page = require("../models/Page");
const ContactMessage = require("../models/ContactMessage");

// Unauthenticated company identity used by the site footer (shown on the auth
// page too, before a token exists) and the static legal pages. Only exposes the
// handful of presentation keys — never the full Setting table.
const PUBLIC_KEYS = [
  "companyName", "companyRegistration",
  "socialTelegram", "socialTwitter", "socialInstagram",
  "supportEmail", "supportPhone",
  "maintenanceMode", "maintenanceMessage",
];

router.get("/settings", async (req, res) => {
  const map = await getSettings(PUBLIC_KEYS);
  res.json({ settings: map });
});

// CMS pages (admin-editable content).
router.get("/pages", async (req, res) => {
  const items = await Page.find({ active: true }).select("title slug updatedAt").sort({ title: 1 });
  res.json({ items });
});
router.get("/page/:slug", async (req, res) => {
  const page = await Page.findOne({ slug: String(req.params.slug).toLowerCase(), active: true });
  if (!page) return res.status(404).json({ error: "page not found" });
  res.json({ page: { title: page.title, slug: page.slug, content: page.content, updatedAt: page.updatedAt } });
});

// Public contact form + newsletter subscribe.
router.post("/contact", async (req, res) => {
  const kind = req.body?.kind === "newsletter" ? "newsletter" : "contact";
  const email = String(req.body?.email || "").trim().slice(0, 200);
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const message = String(req.body?.message || "").trim().slice(0, 4000);
  if (kind === "newsletter" ? !email : (!email && !message)) return res.status(400).json({ error: "email (and a message for contact) required" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip;
  await ContactMessage.create({ kind, name, email, message, ip });
  res.json({ ok: true });
});

module.exports = router;
