const router = require("express").Router();
const { getSettings } = require("../utils/settings");

// Unauthenticated company identity used by the site footer (shown on the auth
// page too, before a token exists) and the static legal pages. Only exposes the
// handful of presentation keys — never the full Setting table.
const PUBLIC_KEYS = [
  "companyName", "companyRegistration",
  "socialTelegram", "socialTwitter", "socialInstagram",
  "supportEmail", "supportPhone",
];

router.get("/settings", async (req, res) => {
  const map = await getSettings(PUBLIC_KEYS);
  res.json({ settings: map });
});

module.exports = router;
