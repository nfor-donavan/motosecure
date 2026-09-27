const express = require("express");
const asyncHandler = require("express-async-handler");
const AuditLog = require("../models/AuditLog");
const { protect, authorize, scopeToTenant } = require("../middleware/auth");

const router = express.Router();

// GET /api/audit-logs
// Read-only, and deliberately restricted to council-side roles (a
// syndicate_admin should not be able to see every administrative
// action across the whole municipality, only their own syndicate's
// data - which is already covered by the syndicates/riders endpoints).
router.get(
  "/",
  protect,
  authorize("mayor", "municipal_staff", "super_admin"),
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToTenant(req) };
    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetType) filter.targetType = req.query.targetType;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit, 10) || 200);

    res.json({ success: true, count: logs.length, logs });
  })
);

module.exports = router;
