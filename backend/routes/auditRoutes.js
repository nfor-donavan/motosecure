const express = require("express");
const asyncHandler = require("express-async-handler");
const AuditLog = require("../models/AuditLog");
const { protect, authorize } = require("../middleware/auth");
const policy = require("../lib/policy");
const { qstr, clampInt } = require("../lib/validate");

const router = express.Router();

// GET /api/audit-logs  (read-only; council roles only, scoped to the municipality)
router.get(
  "/",
  protect,
  authorize("mayor", "municipal_staff", "super_admin"),
  asyncHandler(async (req, res) => {
    const filter = policy.tenantScope(req.user, req.query);
    const action = qstr(req.query.action);
    const targetType = qstr(req.query.targetType);
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(clampInt(req.query.limit, 200, 1, 1000));
    res.json({ success: true, count: logs.length, logs });
  })
);

module.exports = router;
