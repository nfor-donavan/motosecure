const express = require("express");
const asyncHandler = require("express-async-handler");
const Bike = require("../models/Bike");
const Rider = require("../models/Rider");
const {
  protect,
  authorize,
  scopeToSyndicateData,
} = require("../middleware/auth");

const router = express.Router();

// GET /api/bikes
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToSyndicateData(req) };
    // A mayor/municipal_staff/super_admin may still narrow to one
    // syndicate via ?syndicate=; a syndicate_admin is already locked to
    // their own syndicate above and cannot override it to view another.
    if (req.query.syndicate && req.user.role !== "syndicate_admin") {
      filter.syndicate = req.query.syndicate;
    }
    if (req.query.status) filter.status = req.query.status;
    const bikes = await Bike.find(filter)
      .populate("rider", "fullName badgeId")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bikes.length, bikes });
  }),
);

// POST /api/bikes
router.post(
  "/",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const payload = { ...req.body, tenant: req.tenantId || req.body.tenant };
    // A syndicate_admin can only ever register bikes under their own
    // syndicate, regardless of what the request body claims.
    if (req.user.role === "syndicate_admin") {
      payload.syndicate = req.user.syndicate;
    }
    const bike = await Bike.create(payload);
    if (bike.rider) {
      await Rider.findByIdAndUpdate(bike.rider, { bike: bike._id });
    }
    res.status(201).json({ success: true, bike });
  }),
);

// PATCH /api/bikes/:id
router.patch(
  "/:id",
  protect,
  authorize("syndicate_admin", "municipal_staff", "mayor", "super_admin"),
  asyncHandler(async (req, res) => {
    const updates = { ...req.body };
    // A syndicate_admin cannot move a bike to a different syndicate or
    // tenant, no matter what the request body contains.
    if (req.user.role === "syndicate_admin") {
      delete updates.syndicate;
      delete updates.tenant;
    }
    const bike = await Bike.findOneAndUpdate(
      { _id: req.params.id, ...scopeToSyndicateData(req) },
      updates,
      { new: true, runValidators: true },
    );
    if (!bike) {
      res.status(404);
      throw new Error("Bike not found");
    }
    res.json({ success: true, bike });
  }),
);

module.exports = router;
