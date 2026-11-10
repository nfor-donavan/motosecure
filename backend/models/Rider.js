const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * A Rider is an individual moto-taxi driver enrolled under a Syndicate.
 * badgeId is generated server-side (48 random bits) and is the value
 * encoded in the QR badge. nationalIdNumber and dateOfBirth are excluded
 * from queries by default and must be selected explicitly.
 */
const riderSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    syndicate: { type: mongoose.Schema.Types.ObjectId, ref: "Syndicate", required: true, index: true },
    badgeId: {
      type: String,
      default: () => `MS-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
      unique: true,
      immutable: true,
    },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, select: false },
    nationalIdNumber: { type: String, trim: true, select: false },
    phone: { type: String, required: true, trim: true },
    photoUrl: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    licenseExpiresAt: { type: Date },
    bike: { type: mongoose.Schema.Types.ObjectId, ref: "Bike", default: null },
    status: { type: String, enum: ["active", "suspended", "under_review", "revoked"], default: "under_review" },
    verificationCount: { type: Number, default: 0 },
    lastVerifiedAt: { type: Date },
    incidentCount: { type: Number, default: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rider", riderSchema);
