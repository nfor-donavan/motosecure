const nodemailer = require("nodemailer");

/**
 * Sends transactional email via Gmail SMTP using an App Password (not
 * the account's real password). Free for the volume a pilot deployment
 * will ever send - Gmail's free sending limit is ~500/day.
 *
 * If EMAIL_USER/EMAIL_APP_PASSWORD aren't configured, this logs the
 * email to the console instead of throwing, so local development
 * without email configured doesn't break the password-reset flow -
 * you can read the reset link straight from the server logs.
 */
const isConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD && process.env.EMAIL_USER !== "your-email@gmail.com");

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!isConfigured()) {
    console.warn(
      `[email] EMAIL_USER/EMAIL_APP_PASSWORD not configured - printing email instead of sending.\n` +
        `[email] To: ${to}\n[email] Subject: ${subject}\n[email] Body:\n${text || html}\n`
    );
    return { simulated: true };
  }

  const info = await getTransporter().sendMail({
    from: `"MotoSecure" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });

  return info;
};

module.exports = { sendEmail, isConfigured };
