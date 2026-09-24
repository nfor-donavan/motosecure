const express = require("express");
const asyncHandler = require("express-async-handler");
const Bike = require("../models/Bike");
const Rider = require("../models/Rider");
const { protect, authorize, scopeToTenant } = require("../middleware/auth");

const router = express.Router();

// GET /api/bikes
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToTenant(req) };
    if (req.query.syndicate) filter.syndicate = req.query.syndicate;
    if (req.query.status) filter.status = req.query.status;
    const bikes = await Bike.find(filter).populate("rider", "fullName badgeId").sort({ createdAt: -1 });
    res.json({ success: true, count: bikes.length, bikes });
  })
);

// POST /api/bikes
router.post(
  "/",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const bike = await Bike.create({ ...req.body, tenant: req.tenantId || req.body.tenant });
    if (bike.rider) {
      await Rider.findByIdAndUpdate(bike.rider, { bike: bike._id });
    }
    res.status(201).json({ success: true, bike });
  })
);

// PATCH /api/bikes/:id
router.patch(
  "/:id",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const bike = await Bike.findOneAndUpdate(
      { _id: req.params.id, ...scopeToTenant(req) },
      req.body,
      { new: true, runValidators: true }
    );
    if (!bike) {
      res.status(404);
      throw new Error("Bike not found");
    }
    res.json({ success: true, bike });
  })
);

module.exports = router;
