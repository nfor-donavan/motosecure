const express = require("express");
const asyncHandler = require("express-async-handler");
const Syndicate = require("../models/Syndicate");
const {
  protect,
  authorize,
  scopeToTenant,
  scopeToOwnSyndicateRecord,
} = require("../middleware/auth");

const router = express.Router();

// Fields a syndicate_admin is allowed to self-edit. Anything else
// (status, trustScore, tenant, memberCount) must go through a
// mayor/municipal_staff/super_admin approval route instead.
const SYNDICATE_ADMIN_EDITABLE_FIELDS = [
  "presidentName",
  "presidentPhone",
  "contactEmail",
  "zone",
  "documents",
];

// GET /api/syndicates
// A syndicate_admin only sees their own union's listing; mayors,
// municipal_staff and super_admin see every syndicate in the tenant.
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const filter = { ...scopeToOwnSyndicateRecord(req) };
    if (req.query.status) filter.status = req.query.status;
    const syndicates = await Syndicate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: syndicates.length, syndicates });
  }),
);

// GET /api/syndicates/:id
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const syndicate = await Syndicate.findOne({
      _id: req.params.id,
      ...scopeToOwnSyndicateRecord(req),
    });
    if (!syndicate) {
      res.status(404);
      throw new Error("Syndicate not found");
    }
    res.json({ success: true, syndicate });
  }),
);

// POST /api/syndicates (mayor / municipal_staff manually enroll a syndicate)
router.post(
  "/",
  protect,
  authorize("mayor", "municipal_staff", "super_admin"),
  asyncHandler(async (req, res) => {
    const syndicate = await Syndicate.create({
      ...req.body,
      tenant: req.tenantId || req.body.tenant,
    });
    res.status(201).json({ success: true, syndicate });
  }),
);

// PATCH /api/syndicates/:id/status  - approve / reject / suspend
// Deliberately restricted to council-side roles only; a syndicate_admin
// can never call this, so they can never self-approve.
router.patch(
  "/:id/status",
  protect,
  authorize("mayor", "municipal_staff", "super_admin"),
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body;
    const syndicate = await Syndicate.findOneAndUpdate(
      { _id: req.params.id, ...scopeToTenant(req) },
      { status, ...(notes && { notes }) },
      { new: true, runValidators: true },
    );
    if (!syndicate) {
      res.status(404);
      throw new Error("Syndicate not found");
    }
    res.json({ success: true, syndicate });
  }),
);

// PATCH /api/syndicates/:id
// A syndicate_admin may only edit their own record, and only a safe
// allow-list of fields (contact details) - never status, trustScore,
// memberCount or tenant. Council-side roles may edit any field.
router.patch(
  "/:id",
  protect,
  authorize("mayor", "municipal_staff", "syndicate_admin", "super_admin"),
  asyncHandler(async (req, res) => {
    let updates = req.body;
    if (req.user.role === "syndicate_admin") {
      updates = {};
      for (const field of SYNDICATE_ADMIN_EDITABLE_FIELDS) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
    }

    const syndicate = await Syndicate.findOneAndUpdate(
      { _id: req.params.id, ...scopeToOwnSyndicateRecord(req) },
      updates,
      { new: true, runValidators: true },
    );
    if (!syndicate) {
      res.status(404);
      throw new Error("Syndicate not found");
    }
    res.json({ success: true, syndicate });
  }),
);

module.exports = router;
