const mongoose = require("mongoose");

/**
 * Append-only record of administrative actions. Application-level
 * guards below reject updates and deletes through Mongoose. This does
 * NOT protect against someone with direct database access: for that,
 * use a database role without update/delete rights on this collection
 * (see the Security, Privacy and Governance Policy).
 */
const auditLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
      required: function () {
        return this.actorRole !== "super_admin";
      },
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, trim: true },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    targetLabel: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, trim: true },
  },
  { timestamps: true }
);

auditLogSchema.index({ tenant: 1, createdAt: -1 });

const deny = function () {
  throw new Error("AuditLog is append-only: updates and deletes are not permitted");
};
["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "deleteMany", "findOneAndDelete"].forEach((op) =>
  auditLogSchema.pre(op, { document: false, query: true }, deny)
);
auditLogSchema.pre("deleteOne", { document: false, query: true }, deny);
auditLogSchema.pre("deleteOne", { document: true, query: false }, deny);
auditLogSchema.pre("save", function () {
  if (!this.isNew) deny();
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
