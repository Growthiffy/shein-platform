const router = require("express").Router();
const { auth } = require("../middleware/auth");
const Announcement = require("../models/Announcement");

// Active announcements for members: pinned first, then newest.
router.get("/", auth, async (req, res) => {
  const items = await Announcement.find({ active: true })
    .sort({ pinned: -1, publishedAt: -1 }).limit(20);
  res.json({ items });
});

module.exports = router;
