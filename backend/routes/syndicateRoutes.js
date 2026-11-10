const express = require("express");
const asyncHandler = require("express-async-handler");
const Syndicate = require("../models/Syndicate");
const Tenant = require("../models/Tenant");
const { protect, authorize } = require("../middleware/auth");
const policy = require("../lib/policy");
const httpError = require("../lib/httpError");
const { qstr, str, isObjectId } = require("../lib/validate");
const { recordAudit } = require("../lib/audit");

const router = express.Router();
const COUNCIL = ["mayor", "municipal_staff", "super_admin"];
const STATUSES = ["pending", "approved", "rejected", "suspended"];

// GET /api/syndicates  (a syndicate_admin sees only their own union)
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = policy.syndicateListFilter(req.user, req.query);
    const status = qstr(req.query.status);
    if (status && STATUSES.includes(status)) filter.status = status;
    const syndicates = await Syndicate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: syndicates.length, syndicates });
  })
);

// GET /api/syndicates/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const syndicate = await Syndicate.findOne(policy.syndicateRecordFilter(req.user, req.params.id, req.query));
    if (!syndicate) throw httpError(404, "Syndicate not found");
    res.json({ success: true, syndicate });
  })
);

// POST /api/syndicates  (council manually enrolls a syndicate)
router.post(
  "/",
  protect,
  authorize(...COUNCIL),
  asyncHandler(async (req, res) => {
    const data = policy.pick(req.body, policy.syndicateWritableFields(req.user.role, true));
    const tenantId = req.user.role === "super_admin" ? str(req.body.tenant, 24) : req.tenantId;
    if (!isObjectId(tenantId) || !(await Tenant.exists({ _id: tenantId }))) throw httpError(400, "A valid municipality is required");
    const syndicate = await Syndicate.create({ ...data, tenant: tenantId });
    await recordAudit(req, { tenant: syndicate.tenant, action: "syndicate.created", targetType: "Syndicate", targetId: syndicate._id, targetLabel: syndicate.name });
    res.status(201).json({ success: true, syndicate });
  })
);

// PATCH /api/syndicates/:id/status  - approve / reject / suspend (council only)
router.patch(
  "/:id/status",
  protect,
  authorize(...COUNCIL),
  asyncHandler(async (req, res) => {
    const status = qstr(req.body.status);
    if (!STATUSES.includes(status)) throw httpError(400, `status must be one of: ${STATUSES.join(", ")}`);
    const notes = str(req.body.notes, 2000);

    const before = await Syndicate.findOne({ _id: req.params.id, ...policy.tenantScope(req.user, req.query) });
    if (!before) throw httpError(404, "Syndicate not found");
    const from = before.status;

    before.status = status;
    if (notes) before.notes = notes;
    await before.save();

    await recordAudit(req, { tenant: before.tenant, action: `syndicate.${status}`, targetType: "Syndicate", targetId: before._id, targetLabel: before.name, metadata: { from, to: status, notes } });
    res.json({ success: true, syndicate: before });
  })
);

// PATCH /api/syndicates/:id  (council: any non-status field | syndicate_admin: own contact details)
router.patch(
  "/:id",
  protect,
  authorize(...COUNCIL, "syndicate_admin"),
  asyncHandler(async (req, res) => {
    const data = policy.pick(req.body, policy.syndicateWritableFields(req.user.role));
    const syndicate = await Syndicate.findOneAndUpdate(
      policy.syndicateRecordFilter(req.user, req.params.id, req.query),
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!syndicate) throw httpError(404, "Syndicate not found");
    await recordAudit(req, { tenant: syndicate.tenant, action: "syndicate.updated", targetType: "Syndicate", targetId: syndicate._id, targetLabel: syndicate.name, metadata: { fields: Object.keys(data) } });
    res.json({ success: true, syndicate });
  })
);

module.exports = router;
