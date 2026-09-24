const mongoose = require("mongoose");

/**
 * A Syndicate is a moto-taxi ("bendskin") union operating under one
 * municipality's authority. Enrollment happens through the Syndicate
 * Enrollment Portal and must be approved by the tenant before the
 * syndicate's riders can be issued digital badges.
 */
const syndicateSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true, unique: true, sparse: true },
    zone: { type: String, trim: true }, // e.g. "Molyko", "Great Soppo"
    presidentName: { type: String, trim: true },
    presidentPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    memberCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    documents: [
      {
        label: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    trustScore: { type: Number, min: 0, max: 100, default: 70 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

syndicateSchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Syndicate", syndicateSchema);
