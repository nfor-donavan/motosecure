const mongoose = require("mongoose");

/**
 * Records who did what, to which record, and when - for administrative
 * actions that a government deployment needs to be able to answer for
 * (e.g. "who approved this syndicate?", "who suspended this rider, and
 * why?"). This is intentionally append-only: routes create entries here
 * but nothing ever updates or deletes them.
 */
const auditLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    action: {
      type: String,
      required: true,
      trim: true,
      // e.g. "syndicate.approved", "syndicate.rejected",
      // "syndicate.suspended", "syndicate.created", "rider.status_changed"
    },
    targetType: { type: String, trim: true }, // "Syndicate" | "Rider" | "Bike"
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetLabel: { type: String, trim: true }, // human-readable, e.g. rider's name
    metadata: { type: mongoose.Schema.Types.Mixed }, // e.g. { from: "pending", to: "approved" }
  },
  { timestamps: true }
);

auditLogSchema.index({ tenant: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
