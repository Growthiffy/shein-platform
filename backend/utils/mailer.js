const nodemailer = require("nodemailer");

// Provider resolution order:
//   1. RESEND_API_KEY  -> Resend HTTP API (best for Vercel/serverless; no SMTP ports)
//   2. SMTP_HOST       -> classic SMTP via nodemailer
//   3. none            -> no real delivery (dev). Caller can surface the code instead.
function provider() {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "none";
}

const MAIL_FROM = () => process.env.MAIL_FROM || "Shein <onboarding@resend.dev>";

let transporter = null;
function smtpTransport() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendViaResend({ to, subject, text, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: MAIL_FROM(), to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

// Returns true if a real email was dispatched, false if no provider is configured.
// Throws if a provider IS configured but the send fails — callers must not pretend success.
async function sendMail({ to, subject, text, html }) {
  const p = provider();
  if (p === "resend") { await sendViaResend({ to, subject, text, html }); return true; }
  if (p === "smtp") {
    await smtpTransport().sendMail({ from: MAIL_FROM(), to, subject, text, html });
    return true;
  }
  console.log("[DEV MAIL — no provider configured]", to, subject, "\n", text);
  return false;
}

async function sendVerificationCode(to, code) {
  return sendMail({
    to,
    subject: "Your Shein verification code",
    text: `Your verification code is: ${code}\n\nIt expires in 15 minutes.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#c9a24a">Shein</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing:8px;background:#f6f1e7;padding:16px 0;text-align:center;border-radius:8px">${code}</h1>
      <p style="color:#666">Expires in 15 minutes. If you did not request this, ignore this email.</p>
    </div>`,
  });
}

// Shein-branded HTML wrapper (dark, gold accents, footer). `antiPhish` renders
// the user's security phrase so recipients can tell genuine mail from phishing.
function brandedEmail({ heading, bodyHtml, antiPhish }) {
  return `<div style="background:#0b0b0d;padding:28px 0;font-family:system-ui,Arial,sans-serif">
    <div style="max-width:520px;margin:auto;background:#141416;border:1px solid #2a2a2e;border-radius:14px;overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #2a2a2e">
        <span style="font-size:22px;letter-spacing:4px;color:#e9d08b;font-weight:700">SHEIN</span>
      </div>
      <div style="padding:24px;color:#e8e3d7">
        <h2 style="color:#e9d08b;margin:0 0 12px;font-size:19px">${heading}</h2>
        ${bodyHtml}
        ${antiPhish ? `<p style="margin-top:20px;padding-top:14px;border-top:1px solid #2a2a2e;color:#8c8778;font-size:12px">Your security phrase: <b style="color:#e9d08b">${antiPhish}</b></p>` : ""}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #2a2a2e;color:#6f6a5e;font-size:11px">
        © ${new Date().getFullYear()} Shein Global Ltd. This is an automated message.
      </div>
    </div>
  </div>`;
}

// Best-effort transactional send that never throws to the caller (so a mail
// failure can't break the primary action). Returns true if dispatched.
async function sendBranded(to, subject, { heading, bodyHtml, antiPhish, text }) {
  try {
    return await sendMail({ to, subject, text: text || heading, html: brandedEmail({ heading, bodyHtml, antiPhish }) });
  } catch (e) {
    console.error("branded mail failed:", e.message);
    return false;
  }
}

async function sendLoginAlert(user, { ip, userAgent }) {
  if (!user?.email || user.loginAlerts === false) return false;
  return sendBranded(user.email, "New login detected — Shein", {
    heading: "New login detected",
    bodyHtml: `<p>A new sign-in to your Shein account was detected:</p>
      <p style="color:#b8b2a4">IP: ${ip || "unknown"}<br/>Device: ${(userAgent || "unknown").slice(0, 120)}<br/>Time: ${new Date().toUTCString()}</p>
      <p>If this wasn't you, change your password immediately.</p>`,
    antiPhish: user.antiPhishCode,
    text: `New login: ${ip}, ${userAgent}, ${new Date().toUTCString()}. If this wasn't you, change your password.`,
  });
}

async function sendWelcome(user) {
  if (!user?.email) return false;
  return sendBranded(user.email, "Welcome to Shein — Your analyst account is ready", {
    heading: "Welcome to Shein",
    bodyHtml: `<p>Your analyst account is ready. You can now review products, earn commission, and explore investment tiers.</p>
      <p>Log in to start your first analysis cycle.</p>`,
    antiPhish: user.antiPhishCode,
    text: "Welcome to Shein — your analyst account is ready.",
  });
}

async function sendSalaryCredited(user, amount) {
  if (!user?.email) return false;
  return sendBranded(user.email, `Daily earnings credited: +$${amount}`, {
    heading: "Daily earnings credited",
    bodyHtml: `<p>Your daily earnings of <b style="color:#e9d08b">$${amount}</b> have been credited to your balance.</p>`,
    antiPhish: user.antiPhishCode,
    text: `Daily earnings credited: +$${amount}`,
  });
}

async function sendDepositApproved(user, amount) {
  if (!user?.email) return false;
  return sendBranded(user.email, `Your deposit of $${amount} has been credited`, {
    heading: "Deposit credited",
    bodyHtml: `<p>Your deposit of <b style="color:#e9d08b">$${amount}</b> has been reviewed and credited to your balance.</p>`,
    antiPhish: user.antiPhishCode,
    text: `Your deposit of $${amount} has been credited.`,
  });
}

async function sendWithdrawalStatus(user, amount, stage) {
  if (!user?.email) return false;
  const label = String(stage).replace(/_/g, " ");
  return sendBranded(user.email, `Your withdrawal of $${amount} is now ${label}`, {
    heading: "Withdrawal update",
    bodyHtml: `<p>Your withdrawal of <b style="color:#e9d08b">$${amount}</b> is now <b>${label}</b>.</p>`,
    antiPhish: user.antiPhishCode,
    text: `Your withdrawal of $${amount} is now ${label}.`,
  });
}

async function sendInvestPayout(user, amount) {
  if (!user?.email) return false;
  return sendBranded(user.email, `Weekly investment return: +$${amount}`, {
    heading: "Weekly investment return",
    bodyHtml: `<p>Your weekly investment return of <b style="color:#e9d08b">$${amount}</b> has been credited.</p>`,
    antiPhish: user.antiPhishCode,
    text: `Weekly investment return: +$${amount}`,
  });
}

function mailConfigured() { return provider() !== "none"; }

module.exports = {
  sendVerificationCode, sendMail, sendBranded, brandedEmail, mailConfigured,
  sendLoginAlert, sendWelcome, sendSalaryCredited, sendDepositApproved,
  sendWithdrawalStatus, sendInvestPayout,
};
