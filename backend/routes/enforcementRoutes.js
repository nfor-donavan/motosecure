const express = require("express");
const asyncHandler = require("express-async-handler");
const Rider = require("../models/Rider");
const Bike = require("../models/Bike");
const Syndicate = require("../models/Syndicate");
const EnforcementLog = require("../models/EnforcementLog");
const { protect, optionalAuth, authorize } = require("../middleware/auth");
const { limiters } = require("../middleware/security");
const policy = require("../lib/policy");
const httpError = require("../lib/httpError");
const { qstr, str, isObjectId, clampInt, normalizeBadgeId } = require("../lib/validate");
const { resolveVerdict, limitedRiderView } = require("../lib/verdict");

const router = express.Router();
const FIELD_ROLES = ["enforcement_officer", "municipal_staff", "mayor", "super_admin"];
const LOG_TYPES = ["verification", "incident", "warning", "impound"];
const INCIDENT_TYPES = ["incident", "warning", "impound"];
const SEVERITIES = ["low", "medium", "high", "critical"];
const RESULTS = ["valid", "expired", "suspended", "not_found", "flagged"];
const MAX_SYNC_BATCH = 200;
const MAX_SCAN_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// GET /api/enforcement/verify/:badgeId
// Anonymous callers, and officers verifying a rider from another
// municipality, receive a LIMITED view (verdict + masked name) and
// nothing is written. Officers/council verifying a rider of their own
// municipality receive the FULL view and the scan is logged.
// A bad or expired token is rejected (401), never treated as anonymous.
router.get(
  "/verify/:badgeId",
  optionalAuth,
  limiters.verify,
  asyncHandler(async (req, res) => {
    const badgeId = normalizeBadgeId(req.params.badgeId);
    if (!badgeId) throw httpError(400, "Invalid badge identifier");

    const rider = await Rider.findOne({ badgeId })
      .populate("syndicate", "name zone status")
      .populate("bike", "plateNumber roadworthy insuranceExpiresAt");
    if (!rider) return res.json({ success: true, result: "not_found", view: "limited", message: "No rider found for this badge" });

    const result = resolveVerdict(rider);
    const view = policy.verificationView(req.user, rider.tenant);
    if (view === "limited") return res.json({ success: true, result, view, rider: limitedRiderView(rider) });

    await Rider.updateOne({ _id: rider._id }, { $inc: { verificationCount: 1 }, $set: { lastVerifiedAt: new Date() } });
    await EnforcementLog.create({
      tenant: rider.tenant,
      rider: rider._id,
      bike: rider.bike ? rider.bike._id : undefined,
      officer: req.user._id,
      type: "verification",
      result,
      source: "live",
    });
    res.json({
      success: true,
      result,
      view,
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

// POST /api/enforcement/sync-scans
// Flushes verifications recorded offline. Bounded, validated, limited to
// riders of the caller's own municipality, and idempotent per officer via
// the client-generated scanId. The verdict is what the officer's device
// displayed (client-asserted); entries are marked source "offline_sync".
router.post(
  "/sync-scans",
  protect,
  authorize(...FIELD_ROLES),
  asyncHandler(async (req, res) => {
    const scans = req.body && req.body.scans;
    if (!Array.isArray(scans)) throw httpError(400, "scans must be an array");
    if (scans.length > MAX_SYNC_BATCH) throw httpError(400, `At most ${MAX_SYNC_BATCH} scans may be synced per request`);
    if (scans.length === 0) return res.json({ success: true, synced: 0, duplicates: 0, rejected: 0 });

    const now = Date.now();
    const valid = [];
    let rejected = 0;
    for (const s of scans) {
      const badgeId = normalizeBadgeId(s && s.badgeId);
      const result = RESULTS.includes(s && s.result) ? s.result : null;
      const at = s && s.scannedAt ? new Date(s.scannedAt) : new Date(now);
      if (!badgeId || !result || Number.isNaN(at.getTime()) || now - at.getTime() > MAX_SCAN_AGE_MS) { rejected += 1; continue; }
      valid.push({ badgeId, result, at: at.getTime() > now ? new Date(now) : at, clientScanId: str(s.scanId, 64) });
    }

    const riders = await Rider.find({ badgeId: { $in: valid.map((v) => v.badgeId) }, ...policy.tenantScope(req.user, req.query) }).select("_id tenant bike badgeId");
    const byBadge = new Map(riders.map((r) => [r.badgeId, r]));

    let synced = 0;
    let duplicates = 0;
    for (const v of valid) {
      const rider = byBadge.get(v.badgeId);
      if (!rider) { rejected += 1; continue; }
      try {
        await EnforcementLog.create({
          tenant: rider.tenant, rider: rider._id, bike: rider.bike || undefined, officer: req.user._id,
          type: "verification", result: v.result, source: "offline_sync", clientScanId: v.clientScanId, createdAt: v.at,
          location: { label: "Offline scan (synced later)" },
        });
        synced += 1;
      } catch (err) {
        if (err && err.code === 11000) duplicates += 1;
        else throw err;
      }
    }
    res.json({ success: true, synced, duplicates, rejected });
  })
);

// POST /api/enforcement/incident - log an incident / warning / impound
// The rider must belong to the caller's municipality.
router.post(
  "/incident",
  protect,
  authorize(...FIELD_ROLES),
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!isObjectId(b.riderId)) throw httpError(400, "A valid riderId is required");
    const type = b.type === undefined ? "incident" : b.type;
    if (!INCIDENT_TYPES.includes(type)) throw httpError(400, `type must be one of: ${INCIDENT_TYPES.join(", ")}`);
    const severity = b.severity === undefined ? "low" : b.severity;
    if (!SEVERITIES.includes(severity)) throw httpError(400, `severity must be one of: ${SEVERITIES.join(", ")}`);

    const rider = await Rider.findOne({ _id: b.riderId, ...policy.tenantScope(req.user, req.query) });
    if (!rider) throw httpError(404, "Rider not found");

    const loc = b.location && typeof b.location === "object" ? b.location : {};
    const log = await EnforcementLog.create({
      tenant: rider.tenant, rider: rider._id, bike: rider.bike || undefined, officer: req.user._id,
      type, severity, result: "flagged", source: "live",
      description: str(b.description, 1000),
      location: { label: str(loc.label, 120), lat: Number.isFinite(loc.lat) ? loc.lat : undefined, lng: Number.isFinite(loc.lng) ? loc.lng : undefined },
    });
    await Rider.updateOne({ _id: rider._id }, { $inc: { incidentCount: 1 } });
    res.status(201).json({ success: true, log });
  })
);

// GET /api/enforcement/logs  (a syndicate_admin sees only their own riders' entries)
router.get(
  "/logs",
  protect,
  asyncHandler(async (req, res) => {
    const filter = policy.tenantScope(req.user, req.query);
    const type = qstr(req.query.type);
    if (LOG_TYPES.includes(type)) filter.type = type;
    const riderQ = qstr(req.query.rider);

    if (req.user.role === "syndicate_admin") {
      const ids = await Rider.find(policy.syndicateDataScope(req.user, req.query)).distinct("_id");
      filter.rider = { $in: isObjectId(riderQ) ? ids.filter((i) => String(i) === riderQ) : ids };
    } else if (isObjectId(riderQ)) {
      filter.rider = riderQ;
    }

    const logs = await EnforcementLog.find(filter)
      .populate("rider", "fullName badgeId")
      .populate("officer", "fullName badgeNumber")
      .sort({ createdAt: -1 })
      .limit(clampInt(req.query.limit, 100, 1, 500));
    res.json({ success: true, count: logs.length, logs });
  })
);

// GET /api/enforcement/stats - dashboard roll-ups, scoped to the caller
router.get(
  "/stats",
  protect,
  asyncHandler(async (req, res) => {
    const isSyndicateAdmin = req.user.role === "syndicate_admin";
    const tenantFilter = policy.tenantScope(req.user, req.query);
    const riderBikeFilter = policy.syndicateDataScope(req.user, req.query);

    let totalSyndicates = 0;
    let pendingSyndicates = 0;
    if (isSyndicateAdmin) {
      totalSyndicates = req.user.syndicate ? 1 : 0;
    } else {
      [totalSyndicates, pendingSyndicates] = await Promise.all([
        Syndicate.countDocuments(tenantFilter),
        Syndicate.countDocuments({ ...tenantFilter, status: "pending" }),
      ]);
    }

    const incidentFilter = { ...tenantFilter, type: "incident", createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    if (isSyndicateAdmin) incidentFilter.rider = { $in: await Rider.find(riderBikeFilter).distinct("_id") };

    const [totalRiders, activeRiders, totalBikes, incidents30d] = await Promise.all([
      Rider.countDocuments(riderBikeFilter),
      Rider.countDocuments({ ...riderBikeFilter, status: "active" }),
      Bike.countDocuments(riderBikeFilter),
      EnforcementLog.countDocuments(incidentFilter),
    ]);
    res.json({ success: true, stats: { totalRiders, activeRiders, totalBikes, totalSyndicates, pendingSyndicates, incidents30d } });
  })
);

module.exports = router;
