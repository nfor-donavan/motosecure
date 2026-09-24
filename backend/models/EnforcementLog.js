const mongoose = require("mongoose");

/**
 * Every time an enforcement officer (or a member of the public, if the
 * tenant enables public lookups) verifies a rider's badge through the
 * mobile app, a log entry is written here. Incident reports (accidents,
 * misconduct, theft alerts) are also recorded on this model so the
 * Mayoral dashboard can show one unified activity + incident timeline.
 */
const enforcementLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: true,
      index: true,
    },
    bike: { type: mongoose.Schema.Types.ObjectId, ref: "Bike" },
    officer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["verification", "incident", "warning", "impound"],
      default: "verification",
    },
    result: {
      type: String,
      enum: ["valid", "expired", "suspended", "not_found", "flagged"],
      default: "valid",
    },
    location: {
      label: { type: String, trim: true },
      lat: Number,
      lng: Number,
    },
    description: { type: String, trim: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EnforcementLog", enforcementLogSchema);
