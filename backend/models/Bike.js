const mongoose = require("mongoose");

/**
 * A Bike is a registered motorcycle assigned to a rider. Insurance and
 * roadworthiness fields drive compliance flags shown on the Mayoral
 * dashboard and in enforcement app lookups.
 */
const bikeSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    syndicate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Syndicate",
      required: true,
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      default: null,
    },
    plateNumber: { type: String, required: true, trim: true, uppercase: true },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    color: { type: String, trim: true },
    yearOfManufacture: { type: Number },
    chassisNumber: { type: String, trim: true },
    insuranceProvider: { type: String, trim: true },
    insuranceExpiresAt: { type: Date },
    technicalControlExpiresAt: { type: Date },
    roadworthy: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "impounded", "decommissioned"],
      default: "active",
    },
  },
  { timestamps: true }
);

bikeSchema.index({ tenant: 1, plateNumber: 1 }, { unique: true });

module.exports = mongoose.model("Bike", bikeSchema);
