const express = require("express");
const asyncHandler = require("express-async-handler");
const Syndicate = require("../models/Syndicate");
const { protect, authorize, scopeToTenant } = require("../middleware/auth");

const router = express.Router();

// GET /api/syndicates
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToTenant(req) };
    if (req.query.status) filter.status = req.query.status;
    const syndicates = await Syndicate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: syndicates.length, syndicates });
  })
);

// GET /api/syndicates/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const syndicate = await Syndicate.findOne({ _id: req.params.id, ...scopeToTenant(req) });
    if (!syndicate) {
      res.status(404);
      throw new Error("Syndicate not found");
    }
    res.json({ success: true, syndicate });
  })
);

// POST /api/syndicates (mayor / municipal_staff manually enroll a syndicate)
router.post(
  "/",
  protect,
  authorize("mayor", "municipal_staff", "super_admin"),
  asyncHandler(async (req, res) => {
    const syndicate = await Syndicate.create({ ...req.body, tenant: req.tenantId || req.body.tenant });
    res.status(201).json({ success: true, syndicate });
  })
);

// PATCH /api/syndicates/:id/status  - approve / reject / suspend
router.patch(
  "/:id/status",
  protect,
  authorize("mayor", "municipal_staff", "super_admin"),
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const syndicate = await Syndicate.findOneAndUpdate(
      { _id: req.params.id, ...scopeToTenant(req) },
      { status, ...(notes && { notes }) },
      { new: true, runValidators: true }
    );
    if (!syndicate) {
      res.status(404);
      throw new Error("Syndicate not found");
    }
    res.json({ success: true, syndicate });
  })
);

// PATCH /api/syndicates/:id
router.patch(
  "/:id",
  protect,
  authorize("mayor", "municipal_staff", "syndicate_admin", "super_admin"),
  asyncHandler(async (req, res) => {
    const syndicate = await Syndicate.findOneAndUpdate(
      { _id: req.params.id, ...scopeToTenant(req) },
      req.body,
      { new: true, runValidators: true }
    );
    if (!syndicate) {
      res.status(404);
      throw new Error("Syndicate not found");
    }
    res.json({ success: true, syndicate });
  })
);

module.exports = router;
