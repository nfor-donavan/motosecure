const mongoose = require("mongoose");

/**
 * A Tenant represents one municipality / commune (e.g. "Mairie de Buea").
 * Every other collection (users, syndicates, riders, bikes, enforcement
 * logs) carries a `tenant` reference so data from one council never
 * leaks into another's dashboard.
 */
const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Municipality name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    region: {
      type: String,
      required: true,
      trim: true,
    },
    mayorName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    plan: {
      type: String,
      enum: ["trial", "standard", "premium"],
      default: "trial",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "pending",
    },
    settings: {
      requireBikeInsurance: { type: Boolean, default: true },
      maxRidersPerSyndicate: { type: Number, default: 500 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tenant", tenantSchema);
