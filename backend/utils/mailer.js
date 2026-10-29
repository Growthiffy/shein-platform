const nodemailer = require("nodemailer");

let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = { sendMail: async (m) => { console.log("[DEV MAIL]", m.to, m.subject, m.text); return { messageId: "dev" }; } };
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendVerificationCode(to, code) {
  await getTransport().sendMail({
    from: process.env.MAIL_FROM || "Shein <no-reply@shein.local>",
    to,
    subject: "Your Shein verification code",
    text: `Your verification code is: ${code}\n\nIt expires in 15 minutes.`,
    html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>Expires in 15 minutes.</p>`,
  });
}

module.exports = { sendVerificationCode };
