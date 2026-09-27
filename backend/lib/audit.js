const AuditLog = require("../models/AuditLog");

/**
 * Writes one audit log entry. Called from routes right after a
 * successful administrative action. Deliberately fire-and-forget-safe:
 * if writing the audit log itself fails, we log the error but don't
 * fail the underlying request - a missing audit entry is bad, but
 * blocking a real action because logging failed would be worse.
 */
const recordAudit = async (req, { action, targetType, targetId, targetLabel, metadata }) => {
  try {
    await AuditLog.create({
      tenant: req.tenantId || req.body?.tenant,
      actor: req.user._id,
      actorName: req.user.fullName,
      actorRole: req.user.role,
      action,
      targetType,
      targetId,
      targetLabel,
      metadata,
    });
  } catch (err) {
    console.error("[audit] Failed to record audit log:", err.message);
  }
};

module.exports = { recordAudit };
