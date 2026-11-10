const express = require("express");
const asyncHandler = require("express-async-handler");
const QRCode = require("qrcode");
const Rider = require("../models/Rider");
const { protect, authorize } = require("../middleware/auth");
const policy = require("../lib/policy");
const httpError = require("../lib/httpError");
const { qstr, isObjectId, clampInt } = require("../lib/validate");
const { recordAudit } = require("../lib/audit");
const { resolveEnrollmentSyndicate } = require("../lib/enrollment");

const router = express.Router();
const MANAGERS = ["syndicate_admin", "municipal_staff", "mayor", "super_admin"];
const COUNCIL = ["municipal_staff", "mayor", "super_admin"];
const RIDER_STATUSES = ["active", "suspended", "under_review", "revoked"];

// GET /api/riders/offline-snapshot
// Lightweight, tenant-wide list cached by the enforcement app for offline
// checks. Registered before "/:id" so the literal path is matched first.
router.get(
  "/offline-snapshot",
  protect,
  authorize("enforcement_officer", ...COUNCIL),
  asyncHandler(async (req, res) => {
    const riders = await Rider.find(policy.tenantScope(req.user, req.query))
      .select("badgeId fullName status licenseExpiresAt")
      .populate("syndicate", "name")
      .populate("bike", "plateNumber")
      .lean();
    const snapshot = riders.map((r) => ({
      badgeId: r.badgeId,
      fullName: r.fullName,
      status: r.status,
      licenseExpiresAt: r.licenseExpiresAt,
      syndicateName: r.syndicate?.name || null,
      bikePlate: r.bike?.plateNumber || null,
    }));
    res.json({ success: true, generatedAt: new Date().toISOString(), count: snapshot.length, snapshot });
  })
);

// GET /api/riders  (never includes national ID or date of birth; officers also do not receive phone numbers)
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = policy.syndicateDataScope(req.user, req.query);
    const syndicate = qstr(req.query.syndicate);
    if (req.user.role !== "syndicate_admin" && isObjectId(syndicate)) filter.syndicate = syndicate;
    const status = qstr(req.query.status);
    if (RIDER_STATUSES.includes(status)) filter.status = status;

    let query = Rider.find(filter);
    const hidden = policy.riderReadSelect(req.user.role);
    if (hidden) query = query.select(hidden); // never call select() with an empty projection
    const riders = await query
      .populate("syndicate", "name zone")
      .populate("bike", "plateNumber")
      .sort({ createdAt: -1 })
      .limit(clampInt(req.query.limit, 1000, 1, 2000));
    res.json({ success: true, count: riders.length, riders });
  })
);

// GET /api/riders/:id/badge-qr  (not available to enforcement officers)
router.get(
  "/:id/badge-qr",
  protect,
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOne({ _id: req.params.id, ...policy.syndicateDataScope(req.user, req.query) });
    if (!rider) throw httpError(404, "Rider not found");
    const qrDataUrl = await QRCode.toDataURL(rider.badgeId, { margin: 1, width: 300 });
    res.json({ success: true, badgeId: rider.badgeId, qrDataUrl });
  })
);

// GET /api/riders/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const rider = await Rider.findOne({ _id: req.params.id, ...policy.syndicateDataScope(req.user, req.query) })
      .select(policy.riderReadSelect(req.user.role, true))
      .populate("syndicate", "name zone status")
      .populate("bike");
    if (!rider) throw httpError(404, "Rider not found");
    res.json({ success: true, rider });
  })
);

// POST /api/riders
router.post(
  "/",
  protect,
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    const data = policy.pick(req.body, policy.riderWritableFields(req.user.role, true));
    const syndicate = await resolveEnrollmentSyndicate(req, data.syndicate);
    // Status is never client-supplied: a new rider always starts under review.
    const rider = await Rider.create({ ...data, syndicate: syndicate._id, tenant: syndicate.tenant, status: "under_review" });
    await recordAudit(req, { tenant: rider.tenant, action: "rider.created", targetType: "Rider", targetId: rider._id, targetLabel: rider.fullName });
    res.status(201).json({ success: true, rider });
  })
);

// PATCH /api/riders/:id  (status, badge, counters, tenant and syndicate are not editable here)
router.patch(
  "/:id",
  protect,
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    const data = policy.pick(req.body, policy.riderWritableFields(req.user.role));
    const rider = await Rider.findOneAndUpdate(
      { _id: req.params.id, ...policy.syndicateDataScope(req.user, req.query) },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!rider) throw httpError(404, "Rider not found");
    await recordAudit(req, { tenant: rider.tenant, action: "rider.updated", targetType: "Rider", targetId: rider._id, targetLabel: rider.fullName, metadata: { fields: Object.keys(data) } });
    res.json({ success: true, rider });
  })
);

// PATCH /api/riders/:id/status  (council only; always audited)
router.patch(
  "/:id/status",
  protect,
  authorize(...COUNCIL),
  asyncHandler(async (req, res) => {
    const status = qstr(req.body.status);
    if (!RIDER_STATUSES.includes(status)) throw httpError(400, `status must be one of: ${RIDER_STATUSES.join(", ")}`);
    const rider = await Rider.findOne({ _id: req.params.id, ...policy.syndicateDataScope(req.user, req.query) });
    if (!rider) throw httpError(404, "Rider not found");
    const from = rider.status;
    rider.status = status;
    await rider.save();
    await recordAudit(req, { tenant: rider.tenant, action: "rider.status_changed", targetType: "Rider", targetId: rider._id, targetLabel: rider.fullName, metadata: { from, to: status } });
    res.json({ success: true, rider });
  })
);

module.exports = router;
