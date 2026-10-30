// Admin permission areas. An operator with no permissions (or "*") has full
// access (owner); otherwise access is limited to the listed areas.
const PERMISSIONS = [
  { key: "members", label: "Members" },
  { key: "transactions", label: "Transactions" },
  { key: "products", label: "Products" },
  { key: "wallets", label: "Deposit Wallets" },
  { key: "mentors", label: "Mentors" },
  { key: "community", label: "Community" },
  { key: "announcements", label: "Announcements" },
  { key: "personas", label: "Personas" },
  { key: "support", label: "Support" },
  { key: "referrals", label: "Referrals" },
  { key: "login_history", label: "Login History" },
  { key: "settings", label: "Settings" },
  { key: "admins", label: "Manage Admins" },
];
const KEYS = PERMISSIONS.map(p => p.key);

function isFullAccess(u) {
  const p = u?.permissions;
  return !p || p.length === 0 || p.includes("*");
}
function hasAccess(u, perm) {
  if (!perm) return true;               // ungated area (e.g. overview/stats)
  if (isFullAccess(u)) return true;     // owner
  return (u.permissions || []).includes(perm);
}

module.exports = { PERMISSIONS, KEYS, isFullAccess, hasAccess };
