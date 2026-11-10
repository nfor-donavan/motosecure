"use strict";
const Syndicate = require("../models/Syndicate");
const policy = require("./policy");
const httpError = require("./httpError");
const { isObjectId } = require("./validate");

/**
 * Determines which syndicate a new rider or bike is enrolled under.
 *  - syndicate_admin: always their own syndicate, and only once the
 *    municipality has approved it (client input is ignored).
 *  - council roles: the requested syndicate, which must lie inside the
 *    caller's municipality (any municipality for super_admin).
 */
async function resolveEnrollmentSyndicate(req, requestedId) {
  if (req.user.role === "syndicate_admin") {
    const own = req.user.syndicate ? String(req.user.syndicate) : null;
    const syndicate = own ? await Syndicate.findOne(policy.syndicateRecordFilter(req.user, own, req.query)) : null;
    if (!syndicate) throw httpError(403, "Your account is not linked to a syndicate");
    if (syndicate.status !== "approved") {
      throw httpError(403, "Your syndicate must be approved by the municipality before riders or bikes can be enrolled");
    }
    return syndicate;
  }
  if (!isObjectId(requestedId)) throw httpError(400, "A valid syndicate is required");
  const syndicate = await Syndicate.findOne({ _id: requestedId, ...policy.tenantScope(req.user, req.query) });
  if (!syndicate) throw httpError(404, "Syndicate not found");
  return syndicate;
}

module.exports = { resolveEnrollmentSyndicate };
