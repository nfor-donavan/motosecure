const express = require("express");
const asyncHandler = require("express-async-handler");
const Tenant = require("../models/Tenant");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/tenants  (super_admin: all | mayor: own)
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = req.user.role === "super_admin" ? {} : { _id: req.tenantId };
    const tenants = await Tenant.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: tenants.length, tenants });
  })
);

// GET /api/tenants/lookup/:slug - public, used by enrollment portal to resolve a council
router.get(
  "/lookup/:slug",
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.findOne({ slug: req.params.slug }).select(
      "name slug region logoUrl status"
    );
    if (!tenant) {
      res.status(404);
      throw new Error("Municipality not found");
    }
    res.json({ success: true, tenant });
  })
);

// POST /api/tenants  (super_admin only)
router.post(
  "/",
  protect,
  authorize("super_admin"),
  asyncHandler(async (req, res) => {
    const tenant = await Tenant.create(req.body);
    res.status(201).json({ success: true, tenant });
  })
);

// PATCH /api/tenants/:id
router.patch(
  "/:id",
  protect,
  authorize("super_admin", "mayor"),
  asyncHandler(async (req, res) => {
    if (req.user.role === "mayor" && req.params.id !== req.tenantId) {
      res.status(403);
      throw new Error("Forbidden: cannot edit another municipality");
    }
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!tenant) {
      res.status(404);
      throw new Error("Tenant not found");
    }
    res.json({ success: true, tenant });
  })
);

module.exports = router;
