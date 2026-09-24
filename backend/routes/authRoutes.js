const express = require("express");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Tenant = require("../models/Tenant");
const { protect } = require("../middleware/auth");

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

    const tenant = await Tenant.findOne({ slug: tenantSlug });
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
