const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Roles:
 *  - super_admin        platform owner (MotoSecure staff, cross-tenant)
 *  - mayor               municipal command dashboard, full tenant access
 *  - municipal_staff      delegated council staff, read-mostly
 *  - syndicate_admin      manages one syndicate's riders & bikes
 *  - enforcement_officer   uses the public enforcement app to verify riders
 */
const ROLES = [
  "super_admin",
  "mayor",
  "municipal_staff",
  "syndicate_admin",
  "enforcement_officer",
];

const userSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: function () {
        return this.role !== "super_admin";
      },
    },
    syndicate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Syndicate",
      default: null,
    },
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    badgeNumber: { type: String, trim: true }, // for enforcement_officer
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    preferredLanguage: { type: String, enum: ["en", "fr"], default: "en" },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
