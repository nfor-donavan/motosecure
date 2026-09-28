const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const { protect } = require("../middleware/auth");
const { sendEmail } = require("../lib/sendEmail");

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, tenant: user.tenant }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const match = await user.comparePassword(password);
    if (!match) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    user.lastLoginAt = new Date();
    await user.save();

    let tenant = null;
    if (user.tenant) {
      tenant = await Tenant.findById(user.tenant);
    }

    res.json({
      success: true,
      token: signToken(user),
      user: user.toSafeJSON(),
      tenant,
    });
  })
);

// POST /api/auth/register-syndicate
// Public self-service enrollment entry point used by the Syndicate
// Enrollment Portal. Creates a pending syndicate + a syndicate_admin
// user, both awaiting the municipality's approval.
router.post(
  "/register-syndicate",
  asyncHandler(async (req, res) => {
    const Syndicate = require("../models/Syndicate");
    const { tenantSlug, syndicateName, zone, presidentName, presidentPhone, adminFullName, email, phone, password } =
      req.body;

    const tenant = await Tenant.findOne({ slug: String(tenantSlug || "").trim().toLowerCase() });
    if (!tenant) {
      res.status(404);
      throw new Error("Municipality not found");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409);
      throw new Error("An account with this email already exists");
    }

    const syndicate = await Syndicate.create({
      tenant: tenant._id,
      name: syndicateName,
      zone,
      presidentName,
      presidentPhone,
      contactEmail: email,
      status: "pending",
    });

    const user = new User({
      tenant: tenant._id,
      syndicate: syndicate._id,
      fullName: adminFullName,
      email,
      phone,
      role: "syndicate_admin",
    });
    await user.setPassword(password);
    await user.save();

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
// Always responds with the same success message whether or not the
// email exists, so this endpoint can't be used to discover which
// emails are registered on the platform.
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const genericResponse = {
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    };

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.json(genericResponse);
    }

    // Raw token goes in the email link; only its hash is stored, so a
    // database leak alone can never be used to reset someone's password.
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your MotoSecure password",
      text: `We received a request to reset your MotoSecure password. This link expires in 1 hour:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#0A1628;">Reset your MotoSecure password</h2>
          <p>We received a request to reset the password for <strong>${user.email}</strong>.</p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background:#F5A623;color:#0A1628;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;">
              Reset password
            </a>
          </p>
          <p style="color:#5A6B8C;font-size:13px;">If you didn't request this, you can safely ignore this email - your password will not change.</p>
        </div>
      `,
    });

    res.json(genericResponse);
  })
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      res.status(400);
      throw new Error("Email, token and newPassword are required");
    }
    if (newPassword.length < 8) {
      res.status(400);
      throw new Error("Password must be at least 8 characters");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpires");

    if (!user) {
      res.status(400);
      throw new Error("This reset link is invalid or has expired. Please request a new one.");
    }

    await user.setPassword(newPassword);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password has been reset. You can now sign in." });
  })
);

// GET /api/auth/me
router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    let tenant = null;
    if (req.user.tenant) tenant = await Tenant.findById(req.user.tenant);
    res.json({ success: true, user: req.user.toSafeJSON(), tenant });
  })
);

module.exports = router;
