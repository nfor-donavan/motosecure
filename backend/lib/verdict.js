"use strict";
/**
 * Verification verdict logic and public-view redaction. Pure functions.
 * The mobile app contains a deliberately identical copy of resolveVerdict
 * for offline use (mobile/src/lib/offlineCache.js); a unit test keeps the
 * two in step.
 */
function resolveVerdict(rider, now = new Date()) {
  if (!rider) return "not_found";
  if (rider.status === "suspended") return "suspended";
  if (rider.status === "revoked" || rider.status === "under_review") return "flagged";
  if (rider.licenseExpiresAt && new Date(rider.licenseExpiresAt) < now) return "expired";
  return "valid";
}

/** "Enow Peter" -> "Enow P." ; single names are reduced to an initial. */
function maskName(fullName) {
  if (typeof fullName !== "string") return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `${parts[0][0].toUpperCase()}.`;
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** What a caller without full verification rights is allowed to see. */
function limitedRiderView(rider) {
  return { badgeId: rider.badgeId, fullName: maskName(rider.fullName) };
}

module.exports = { resolveVerdict, maskName, limitedRiderView };
