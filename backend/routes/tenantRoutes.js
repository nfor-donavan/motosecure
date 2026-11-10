const express = require("express");
const asyncHandler = require("express-async-handler");
const Tenant = require("../models/Tenant");
const { protect, authorize } = require("../middleware/auth");
const policy = require("../lib/policy");
const httpError = require("../lib/httpError");
const { str, isObjectId } = require("../lib/validate");
const { recordAudit } = require("../lib/audit");

const router = express.Router();

// GET /api/tenants  (super_admin: all | others: own municipality)
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "super_admin" ? {} : { _id: policy.tenantScope(req.user).tenant };
    const tenants = await Tenant.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: tenants.length, tenants });
  })
);

// GET /api/tenants/public - councils open to enrollment (name, slug, region only)
router.get(
  "/public",
  asyncHandler(async (req, res) => {
    const tenants = await Tenant.find({ status: { $ne: "suspended" } }).select("name slug region").sort({ name: 1 });
    res.json({ success: true, tenants });
  })
);

// GET /api/tenants/lookup/:slug - public, minimal fields
router.get(
  "/lookup/:slug",
  asyncHandler(async (req, res) => {
    const slug = str(req.params.slug, 80)?.toLowerCase();
    const tenant = slug && (await Tenant.findOne({ slug }).select("name slug region logoUrl status"));
    if (!tenant) throw httpError(404, "Municipality not found");
    res.json({ success: true, tenant });
  })
);

// POST /api/tenants  (super_admin only)
router.post(
  "/",
  protect,
  authorize("super_admin"),
  asyncHandler(async (req, res) => {
    const data = policy.pick(req.body, policy.tenantWritableFields("super_admin"));
    if (typeof data.slug === "string") data.slug = data.slug.trim().toLowerCase();
    const tenant = await Tenant.create(data);
    await recordAudit(req, { tenant: tenant._id, action: "tenant.created", targetType: "Tenant", targetId: tenant._id, targetLabel: tenant.name });
    res.status(201).json({ success: true, tenant });
  })
);

// PATCH /api/tenants/:id  (super_admin: any field | mayor: own contact details only)
router.patch(
  "/:id",
  protect,
  authorize("super_admin", "mayor"),
  asyncHandler(async (req, res) => {
    if (!isObjectId(req.params.id)) throw httpError(404, "Tenant not found");
    if (req.user.role === "mayor" && req.params.id !== req.tenantId) throw httpError(403, "Forbidden: cannot edit another municipality");
    const data = policy.pick(req.body, policy.tenantWritableFields(req.user.role));
    if (typeof data.slug === "string") data.slug = data.slug.trim().toLowerCase();
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!tenant) throw httpError(404, "Tenant not found");
    await recordAudit(req, { tenant: tenant._id, action: "tenant.updated", targetType: "Tenant", targetId: tenant._id, targetLabel: tenant.name, metadata: { fields: Object.keys(data) } });
    res.json({ success: true, tenant });
  })
);

module.exports = router;
