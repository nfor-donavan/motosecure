"use strict";
const nodemailer = require("nodemailer");

const isConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD && process.env.EMAIL_USER !== "your-email@gmail.com");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    });
  }
  return transporter;
};

/**
 * Sends transactional email via SMTP. When email is not configured:
 *  - outside production the message is printed so developers can use
 *    the reset link from the console;
 *  - in production nothing sensitive is printed (a reset link in server
 *    logs would let anyone with log access take over an account).
 */
async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[email] not configured; message "${subject}" was not sent.`);
    } else {
      console.warn(`[email] not configured; printing instead.\nTo: ${to}\nSubject: ${subject}\n${text || ""}\n`);
    }
    return { simulated: true };
  }
  return getTransporter().sendMail({ from: `"MotoSecure" <${process.env.EMAIL_USER}>`, to, subject, html, text });
}

module.exports = { sendEmail, isConfigured, escapeHtml };
