"use strict";
const AuditLog = require("../models/AuditLog");

/**
 * Appends an audit entry. A failure to write the audit record is logged
 * to the server console but does not fail the user's request: this is a
 * deliberate availability-over-completeness trade-off, documented in
 * the Security Assessment. Entries never contain passwords, tokens or
 * personal identifiers beyond the target's display label.
 */
async function recordAuditEvent(entry) {
  try {
    await AuditLog.create(entry);
  } catch (err) {
    console.error("[audit] failed to record audit entry:", err.message);
  }
}

/** Convenience wrapper for authenticated requests. */
function recordAudit(req, { tenant, action, targetType, targetId, targetLabel, metadata }) {
  return recordAuditEvent({
    tenant: tenant || req.tenantId || undefined,
    actor: req.user._id,
    actorName: req.user.fullName,
    actorRole: req.user.role,
    action,
    targetType,
    targetId,
    targetLabel,
    metadata,
    ip: req.ip,
  });
}

module.exports = { recordAudit, recordAuditEvent };
