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

function mailConfigured() { return provider() !== "none"; }

module.exports = { sendVerificationCode, sendMail, mailConfigured };
