const express = require("express");
const asyncHandler = require("express-async-handler");
const Rider = require("../models/Rider");
const Bike = require("../models/Bike");
const Syndicate = require("../models/Syndicate");
const EnforcementLog = require("../models/EnforcementLog");
const {
  protect,
  authorize,
  scopeToTenant,
  scopeToSyndicateData,
} = require("../middleware/auth");

const router = express.Router();

/**
 * EnforcementLog has no direct `syndicate` field (it only references a
 * rider), so scoping logs/stats to one syndicate means first resolving
 * which rider IDs belong to that syndicate, then filtering logs by
 * `rider: { $in: riderIds }`. Returns null for non-syndicate_admin
 * callers, meaning "no extra restriction needed".
 */
const getSyndicateRiderIdFilter = async (req) => {
  if (req.user.role !== "syndicate_admin") return null;
  const riderIds = await Rider.find({ ...scopeToSyndicateData(req) }).distinct(
    "_id",
  );
  return riderIds;
};

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
    else if (rider.status === "revoked" || rider.status === "under_review")
      result = "flagged";
    else if (rider.licenseExpiresAt && rider.licenseExpiresAt < new Date())
      result = "expired";

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
  }),
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
  }),
);

// GET /api/enforcement/logs
// A syndicate_admin only sees logs for their own union's riders; every
// other role sees the full tenant-wide log.
router.get(
  "/logs",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToTenant(req) };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.rider) filter.rider = req.query.rider;

    const syndicateRiderIds = await getSyndicateRiderIdFilter(req);
    if (syndicateRiderIds) {
      // Intersect with any explicit ?rider= filter rather than blindly
      // overwriting it.
      filter.rider = req.query.rider
        ? req.query.rider
        : { $in: syndicateRiderIds };
    }

    const logs = await EnforcementLog.find(filter)
      .populate("rider", "fullName badgeId")
      .populate("officer", "fullName badgeNumber")
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit, 10) || 100);

    res.json({ success: true, count: logs.length, logs });
  }),
);

// GET /api/enforcement/stats - roll-up numbers for the dashboard
// A syndicate_admin gets numbers scoped to their own syndicate only;
// mayor/municipal_staff/super_admin get the full tenant-wide picture.
router.get(
  "/stats",
  protect,
  asyncHandler(async (req, res) => {
    const isSyndicateAdmin = req.user.role === "syndicate_admin";
    const riderBikeFilter = isSyndicateAdmin
      ? scopeToSyndicateData(req)
      : scopeToTenant(req);
    const tenantFilter = scopeToTenant(req);

    let totalSyndicates = 0;
    let pendingSyndicates = 0;
    if (isSyndicateAdmin) {
      // A syndicate_admin's "syndicates" count is just their own
      // listing (1, or 0 if somehow unassigned), and they never see a
      // "pending approvals" queue - that's a council-only concept.
      totalSyndicates = req.user.syndicate ? 1 : 0;
    } else {
      [totalSyndicates, pendingSyndicates] = await Promise.all([
        Syndicate.countDocuments(tenantFilter),
        Syndicate.countDocuments({ ...tenantFilter, status: "pending" }),
      ]);
    }

    const incidentFilter = {
      ...tenantFilter,
      type: "incident",
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    };
    const syndicateRiderIds = await getSyndicateRiderIdFilter(req);
    if (syndicateRiderIds) {
      incidentFilter.rider = { $in: syndicateRiderIds };
    }

    const [totalRiders, activeRiders, totalBikes, incidents30d] =
      await Promise.all([
        Rider.countDocuments(riderBikeFilter),
        Rider.countDocuments({ ...riderBikeFilter, status: "active" }),
        Bike.countDocuments(riderBikeFilter),
        EnforcementLog.countDocuments(incidentFilter),
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
  }),
);

module.exports = router;
