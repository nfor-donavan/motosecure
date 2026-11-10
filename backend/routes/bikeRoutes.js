const express = require("express");
const asyncHandler = require("express-async-handler");
const Bike = require("../models/Bike");
const Rider = require("../models/Rider");
const { protect, authorize } = require("../middleware/auth");
const policy = require("../lib/policy");
const httpError = require("../lib/httpError");
const { qstr, isObjectId, clampInt } = require("../lib/validate");
const { recordAudit } = require("../lib/audit");
const { resolveEnrollmentSyndicate } = require("../lib/enrollment");

const router = express.Router();
const MANAGERS = ["syndicate_admin", "municipal_staff", "mayor", "super_admin"];
const BIKE_STATUSES = ["active", "impounded", "decommissioned"];

/** A bike may only be linked to a rider of the same municipality AND syndicate. */
async function resolveRider(riderId, tenant, syndicate) {
  if (riderId === undefined) return undefined;          // not being changed
  if (riderId === null || riderId === "") return null;  // explicit unlink
  if (!isObjectId(riderId)) throw httpError(400, "Invalid rider");
  const rider = await Rider.findOne({ _id: riderId, tenant, syndicate });
  if (!rider) throw httpError(404, "Rider not found in this syndicate");
  return rider;
}

// GET /api/bikes
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = policy.syndicateDataScope(req.user, req.query);
    const syndicate = qstr(req.query.syndicate);
    if (req.user.role !== "syndicate_admin" && isObjectId(syndicate)) filter.syndicate = syndicate;
    const status = qstr(req.query.status);
    if (BIKE_STATUSES.includes(status)) filter.status = status;
    const bikes = await Bike.find(filter)
      .populate("rider", "fullName badgeId")
      .sort({ createdAt: -1 })
      .limit(clampInt(req.query.limit, 1000, 1, 2000));
    res.json({ success: true, count: bikes.length, bikes });
  })
);

// POST /api/bikes
router.post(
  "/",
  protect,
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    const data = policy.pick(req.body, policy.bikeWritableFields(req.user.role, true));
    const syndicate = await resolveEnrollmentSyndicate(req, data.syndicate);
    const rider = await resolveRider(data.rider, syndicate.tenant, syndicate._id);
    const bike = await Bike.create({ ...data, rider: rider ? rider._id : null, syndicate: syndicate._id, tenant: syndicate.tenant });
    if (rider) await Rider.updateOne({ _id: rider._id }, { $set: { bike: bike._id } });
    await recordAudit(req, { tenant: bike.tenant, action: "bike.created", targetType: "Bike", targetId: bike._id, targetLabel: bike.plateNumber });
    res.status(201).json({ success: true, bike });
  })
);

// PATCH /api/bikes/:id  (tenant and syndicate are not editable)
router.patch(
  "/:id",
  protect,
  authorize(...MANAGERS),
  asyncHandler(async (req, res) => {
    const existing = await Bike.findOne({ _id: req.params.id, ...policy.syndicateDataScope(req.user, req.query) });
    if (!existing) throw httpError(404, "Bike not found");

    const data = policy.pick(req.body, policy.bikeWritableFields(req.user.role));
    const newRider = await resolveRider(data.rider, existing.tenant, existing.syndicate);
    delete data.rider;

    Object.assign(existing, data);
    const oldRiderId = existing.rider ? String(existing.rider) : null;
    if (newRider !== undefined) existing.rider = newRider ? newRider._id : null;
    await existing.save();

    if (newRider !== undefined) {
      if (oldRiderId && oldRiderId !== String(existing.rider || "")) {
        await Rider.updateOne({ _id: oldRiderId, bike: existing._id }, { $set: { bike: null } });
      }
      if (newRider) await Rider.updateOne({ _id: newRider._id }, { $set: { bike: existing._id } });
    }
    await recordAudit(req, { tenant: existing.tenant, action: "bike.updated", targetType: "Bike", targetId: existing._id, targetLabel: existing.plateNumber, metadata: { fields: Object.keys(req.body || {}).filter((k) => policy.bikeWritableFields(req.user.role).includes(k)) } });
    res.json({ success: true, bike: existing });
  })
);

module.exports = router;
