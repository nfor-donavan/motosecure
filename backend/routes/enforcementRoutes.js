const express = require("express");
const asyncHandler = require("express-async-handler");
const Rider = require("../models/Rider");
const EnforcementLog = require("../models/EnforcementLog");
const { protect, authorize, scopeToTenant } = require("../middleware/auth");

const router = express.Router();

// GET /api/enforcement/verify/:badgeId
// Public-facing endpoint used by the enforcement mobile app (and, if a
// tenant allows it, members of the public) to scan a rider's QR badge
// and instantly see whether they are cleared to operate.
router.get(
  "/verify/:badgeId",
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOne({ badgeId: req.params.badgeId })
      .populate("syndicate", "name zone status")
      .populate("bike", "plateNumber roadworthy insuranceExpiresAt");

    if (!rider) {
      return res.json({
        success: true,
        result: "not_found",
        message: "No rider found for this badge",
      });
    }

    let result = "valid";
    if (rider.status === "suspended") result = "suspended";
    else if (rider.status === "revoked" || rider.status === "under_review") result = "flagged";
    else if (rider.licenseExpiresAt && rider.licenseExpiresAt < new Date()) result = "expired";

    rider.verificationCount += 1;
    rider.lastVerifiedAt = new Date();
    await rider.save();

    await EnforcementLog.create({
      tenant: rider.tenant,
      rider: rider._id,
      bike: rider.bike?._id,
      officer: req.user?._id,
      type: "verification",
      result,
      location: req.body?.location,
    });

    res.json({
      success: true,
      result,
      rider: {
        id: rider._id,
        badgeId: rider.badgeId,
        fullName: rider.fullName,
        photoUrl: rider.photoUrl,
        status: rider.status,
        syndicate: rider.syndicate,
        bike: rider.bike,
        licenseExpiresAt: rider.licenseExpiresAt,
      },
    });
  })
);

// POST /api/enforcement/incident - log an incident / warning / impound
router.post(
  "/incident",
  protect,
  authorize("enforcement_officer", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const { riderId, bikeId, type, description, severity, location } = req.body;

    const rider = await Rider.findById(riderId);
    if (!rider) {
      res.status(404);
      throw new Error("Rider not found");
    }

    const log = await EnforcementLog.create({
      tenant: rider.tenant,
      rider: rider._id,
      bike: bikeId,
      officer: req.user._id,
      type: type || "incident",
      description,
      severity,
      location,
      result: "flagged",
    });

    rider.incidentCount += 1;
    await rider.save();

    res.status(201).json({ success: true, log });
  })
);

// GET /api/enforcement/logs
router.get(
  "/logs",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToTenant(req) };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.rider) filter.rider = req.query.rider;

    const logs = await EnforcementLog.find(filter)
      .populate("rider", "fullName badgeId")
      .populate("officer", "fullName badgeNumber")
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit, 10) || 100);

    res.json({ success: true, count: logs.length, logs });
  })
);

// GET /api/enforcement/stats - roll-up numbers for the Mayoral dashboard
router.get(
  "/stats",
  protect,
  asyncHandler(async (req, res) => {
    const tenantFilter = scopeToTenant(req);

    const [Rider2, Bike2, Syndicate2] = [
      require("../models/Rider"),
      require("../models/Bike"),
      require("../models/Syndicate"),
    ];

    const [totalRiders, activeRiders, totalBikes, totalSyndicates, pendingSyndicates, incidents30d] =
      await Promise.all([
        Rider2.countDocuments(tenantFilter),
        Rider2.countDocuments({ ...tenantFilter, status: "active" }),
        Bike2.countDocuments(tenantFilter),
        Syndicate2.countDocuments(tenantFilter),
        Syndicate2.countDocuments({ ...tenantFilter, status: "pending" }),
        EnforcementLog.countDocuments({
          ...tenantFilter,
          type: "incident",
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ]);

    res.json({
      success: true,
      stats: {
        totalRiders,
        activeRiders,
        totalBikes,
        totalSyndicates,
        pendingSyndicates,
        incidents30d,
      },
    });
  })
);

module.exports = router;
