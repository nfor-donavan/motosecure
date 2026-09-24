const express = require("express");
const asyncHandler = require("express-async-handler");
const QRCode = require("qrcode");
const Rider = require("../models/Rider");
const { protect, authorize, scopeToTenant } = require("../middleware/auth");

const router = express.Router();

// GET /api/riders
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToTenant(req) };
    if (req.query.syndicate) filter.syndicate = req.query.syndicate;
    if (req.query.status) filter.status = req.query.status;

    const riders = await Rider.find(filter)
      .populate("syndicate", "name zone")
      .populate("bike", "plateNumber")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: riders.length, riders });
  })
);

// GET /api/riders/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOne({ _id: req.params.id, ...scopeToTenant(req) })
      .populate("syndicate")
      .populate("bike");
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    res.json({ success: true, rider });
  })
);

// GET /api/riders/:id/badge-qr - returns a data URL PNG QR code encoding the badgeId
router.get(
  "/:id/badge-qr",
  protect,
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOne({ _id: req.params.id, ...scopeToTenant(req) });
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    const dataUrl = await QRCode.toDataURL(rider.badgeId, { margin: 1, width: 300 });
    res.json({ success: true, badgeId: rider.badgeId, qrDataUrl: dataUrl });
  })
);

// POST /api/riders
router.post(
  "/",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const rider = await Rider.create({ ...req.body, tenant: req.tenantId || req.body.tenant });
    res.status(201).json({ success: true, rider });
  })
);

// PATCH /api/riders/:id
router.patch(
  "/:id",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOneAndUpdate(
      { _id: req.params.id, ...scopeToTenant(req) },
      req.body,
      { new: true, runValidators: true }
    );
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    res.json({ success: true, rider });
  })
);

// PATCH /api/riders/:id/status
router.patch(
  "/:id/status",
  protect,
  authorize("municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOneAndUpdate(
      { _id: req.params.id, ...scopeToTenant(req) },
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    res.json({ success: true, rider });
  })
);

module.exports = router;
