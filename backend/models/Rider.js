const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

/**
 * A Rider is an individual moto-taxi driver enrolled under a Syndicate.
 * Each rider gets a unique badgeId that is encoded into a QR code and
 * printed on a physical badge; the public enforcement app scans this
 * QR code to pull up the rider's verification status in real time.
 */
const riderSchema = new mongoose.Schema(
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
      index: true,
    },
    badgeId: {
      type: String,
      default: () => `MS-${uuidv4().split("-")[0].toUpperCase()}`,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    nationalIdNumber: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    licenseExpiresAt: { type: Date },
    bike: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "under_review", "revoked"],
      default: "under_review",
    },
    verificationCount: { type: Number, default: 0 },
    lastVerifiedAt: { type: Date },
    incidentCount: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rider", riderSchema);
