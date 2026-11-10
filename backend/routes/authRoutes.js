const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const Syndicate = require("../models/Syndicate");
const { protect } = require("../middleware/auth");
const { limiters } = require("../middleware/security");
const { sendEmail, escapeHtml } = require("../lib/sendEmail");
const { recordAuditEvent } = require("../lib/audit");
const httpError = require("../lib/httpError");
const { isEmail, passwordProblems, str } = require("../lib/validate");

const router = express.Router();

const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;
const GENERIC_LOGIN_ERROR = "Invalid credentials, or the account is temporarily locked.";
// Compared against when the account does not exist, so response time
// does not reveal whether an email is registered.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-password", 10);

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, tenant: user.tenant }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    algorithm: "HS256",
  });

const actorOf = (user) => ({ tenant: user.tenant, actor: user._id, actorName: user.fullName, actorRole: user.role });

// POST /api/auth/login
router.post(
  "/login",
  limiters.login,
  asyncHandler(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : null;
    const password = typeof req.body.password === "string" ? req.body.password : null;
    if (!email || !password) throw httpError(400, "Email and password are required");

    const now = new Date();
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.isActive || (user.lockUntil && user.lockUntil > now)) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw httpError(401, GENERIC_LOGIN_ERROR);
    }

    if (!(await user.comparePassword(password))) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      let locked = false;
      if (user.failedLoginCount >= LOCK_THRESHOLD) {
        user.lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginCount = 0;
        locked = true;
      }
      await user.save();
      if (locked) {
        await recordAuditEvent({ ...actorOf(user), action: "auth.account_locked", targetType: "User", targetId: user._id, targetLabel: user.email, ip: req.ip });
      }
      throw httpError(401, GENERIC_LOGIN_ERROR);
    }

    user.failedLoginCount = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = now;
    await user.save();

    const tenant = user.tenant ? await Tenant.findById(user.tenant) : null;
    res.json({ success: true, token: signToken(user), user: user.toSafeJSON(), tenant });
  })
);

// POST /api/auth/register-syndicate
// Public self-service enrollment. Creates a PENDING syndicate and its
// syndicate_admin account; the municipality must approve it before the
// syndicate can enroll riders or bikes.
router.post(
  "/register-syndicate",
  limiters.register,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const fields = {
      tenantSlug: str(b.tenantSlug, 80)?.toLowerCase(),
      syndicateName: str(b.syndicateName, 120),
      zone: str(b.zone, 120),
      presidentName: str(b.presidentName, 120),
      presidentPhone: str(b.presidentPhone, 40),
      adminFullName: str(b.adminFullName, 120),
      phone: str(b.phone, 40),
    };
    const missing = Object.entries(fields).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) throw httpError(400, `Missing or invalid fields: ${missing.join(", ")}`);

    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    if (!isEmail(email)) throw httpError(400, "A valid email address is required");
    const pw = passwordProblems(b.password);
    if (pw.length) throw httpError(400, `Password must have: ${pw.join(", ")}`);

    const tenant = await Tenant.findOne({ slug: fields.tenantSlug, status: { $ne: "suspended" } });
    if (!tenant) throw httpError(404, "Municipality not found");
    if (await User.exists({ email })) throw httpError(409, "An account with this email already exists");

    const syndicate = await Syndicate.create({
      tenant: tenant._id,
      name: fields.syndicateName,
      zone: fields.zone,
      presidentName: fields.presidentName,
      presidentPhone: fields.presidentPhone,
      contactEmail: email,
      status: "pending",
    });

    let user;
    try {
      user = new User({ tenant: tenant._id, syndicate: syndicate._id, fullName: fields.adminFullName, email, phone: fields.phone, role: "syndicate_admin" });
      await user.setPassword(b.password);
      await user.save();
    } catch (err) {
      await Syndicate.deleteOne({ _id: syndicate._id }); // do not leave an orphaned syndicate
      throw err;
    }

    await recordAuditEvent({ ...actorOf(user), action: "syndicate.registered", targetType: "Syndicate", targetId: syndicate._id, targetLabel: syndicate.name, ip: req.ip });

    res.status(201).json({
      success: true,
      message: "Enrollment submitted. Awaiting municipal approval.",
      token: signToken(user),
      user: user.toSafeJSON(),
      syndicate,
    });
  })
);

// POST /api/auth/forgot-password
// Same response whether or not the account exists; the email is sent
// without being awaited so response time does not leak existence.
router.post(
  "/forgot-password",
  limiters.forgot,
  asyncHandler(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : null;
    if (!email) throw httpError(400, "Email is required");

    const generic = { success: true, message: "If an account exists for that email, a reset link has been sent." };
    const user = await User.findOne({ email, isActive: true });
    if (!user) return res.json(generic);

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const base = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${base}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    sendEmail({
      to: user.email,
      subject: "Reset your MotoSecure password",
      text: `We received a request to reset your MotoSecure password. This link expires in 1 hour:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><h2>Reset your MotoSecure password</h2><p>A reset was requested for <strong>${escapeHtml(user.email)}</strong>. This link expires in <strong>1 hour</strong>.</p><p><a href="${escapeHtml(resetUrl)}" style="background:#F5A623;color:#0A1628;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Reset password</a></p><p style="color:#5A6B8C;font-size:13px">If you did not request this, ignore this email; your password will not change.</p></div>`,
    }).catch((err) => console.error("[email] send failed:", err.message));

    res.json(generic);
  })
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  limiters.forgot,
  asyncHandler(async (req, res) => {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : null;
    const { token, newPassword } = req.body;
    if (!email || typeof token !== "string" || typeof newPassword !== "string") throw httpError(400, "Email, token and newPassword are required");
    const pw = passwordProblems(newPassword);
    if (pw.length) throw httpError(400, `Password must have: ${pw.join(", ")}`);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email,
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpires");
    if (!user) throw httpError(400, "This reset link is invalid or has expired. Please request a new one.");

    await user.setPassword(newPassword); // also stamps passwordChangedAt, invalidating older tokens
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    user.failedLoginCount = 0;
    user.lockUntil = undefined;
    await user.save();

    await recordAuditEvent({ ...actorOf(user), action: "auth.password_reset_completed", targetType: "User", targetId: user._id, targetLabel: user.email, ip: req.ip });
    res.json({ success: true, message: "Password has been reset. You can now sign in." });
  })
);

// GET /api/auth/me
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    const tenant = req.user.tenant ? await Tenant.findById(req.user.tenant) : null;
    res.json({ success: true, user: req.user.toSafeJSON(), tenant });
  })
);

module.exports = router;
