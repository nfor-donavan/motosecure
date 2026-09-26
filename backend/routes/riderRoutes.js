const express = require("express");
const asyncHandler = require("express-async-handler");
const QRCode = require("qrcode");
const Rider = require("../models/Rider");
const {
  protect,
  authorize,
  scopeToSyndicateData,
} = require("../middleware/auth");

const router = express.Router();

// GET /api/riders
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToSyndicateData(req) };
    // A mayor/municipal_staff/super_admin may still narrow to one
    // syndicate via ?syndicate=; a syndicate_admin is already locked to
    // their own syndicate above and cannot override it to view another.
    if (req.query.syndicate && req.user.role !== "syndicate_admin") {
      filter.syndicate = req.query.syndicate;
    }
    if (req.query.status) filter.status = req.query.status;

    const riders = await Rider.find(filter)
      .populate("syndicate", "name zone")
      .populate("bike", "plateNumber")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: riders.length, riders });
  }),
);

// GET /api/riders/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOne({
      _id: req.params.id,
      ...scopeToSyndicateData(req),
    })
      .populate("syndicate")
      .populate("bike");
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    res.json({ success: true, rider });
  }),
);

// GET /api/riders/:id/badge-qr - returns a data URL PNG QR code encoding the badgeId
router.get(
  "/:id/badge-qr",
  protect,
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOne({
      _id: req.params.id,
      ...scopeToSyndicateData(req),
    });
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    const dataUrl = await QRCode.toDataURL(rider.badgeId, {
      margin: 1,
      width: 300,
    });
    res.json({ success: true, badgeId: rider.badgeId, qrDataUrl: dataUrl });
  }),
);

// POST /api/riders
router.post(
  "/",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const payload = { ...req.body, tenant: req.tenantId || req.body.tenant };
    // A syndicate_admin can only ever enroll riders into their own
    // syndicate, regardless of what the request body claims.
    if (req.user.role === "syndicate_admin") {
      payload.syndicate = req.user.syndicate;
    }
    const rider = await Rider.create(payload);
    res.status(201).json({ success: true, rider });
  }),
);

// PATCH /api/riders/:id
router.patch(
  "/:id",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    // A syndicate_admin cannot move a rider to a different syndicate or
    // tenant, no matter what the request body contains.
    if (req.user.role === "syndicate_admin") {
      delete updates.syndicate;
      delete updates.tenant;
    }
    const rider = await Rider.findOneAndUpdate(
      { _id: req.params.id, ...scopeToSyndicateData(req) },
      updates,
      { new: true, runValidators: true },
    );
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    res.json({ success: true, rider });
  }),
);

// PATCH /api/riders/:id/status
router.patch(
  "/:id/status",
  protect,
  authorize("municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOneAndUpdate(
      { _id: req.params.id, ...scopeToSyndicateData(req) },
      { status: req.body.status },
      { new: true, runValidators: true },
    );
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }
    res.json({ success: true, rider });
  }),
);

module.exports = router;
