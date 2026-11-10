const mongoose = require("mongoose");

/**
 * Every badge verification and incident report. `source` distinguishes
 * a live scan from one recorded offline and synced later;
 * `clientScanId` makes offline sync idempotent per officer.
 */
const enforcementLogSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: "Rider", required: true, index: true },
    bike: { type: mongoose.Schema.Types.ObjectId, ref: "Bike" },
    officer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["verification", "incident", "warning", "impound"], default: "verification" },
    result: { type: String, enum: ["valid", "expired", "suspended", "not_found", "flagged"], default: "valid" },
    source: { type: String, enum: ["live", "offline_sync"], default: "live" },
    clientScanId: { type: String, trim: true, maxlength: 64 },
    location: { label: { type: String, trim: true }, lat: Number, lng: Number },
    description: { type: String, trim: true, maxlength: 1000 },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
  },
  { timestamps: true }
);

enforcementLogSchema.index(
  { officer: 1, clientScanId: 1 },
  { unique: true, partialFilterExpression: { clientScanId: { $type: "string" } } }
);

module.exports = mongoose.model("EnforcementLog", enforcementLogSchema);
