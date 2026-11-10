"use strict";
/**
 * Authorization policy for MotoSecure. Pure functions: they take a user
 * object ({ role, tenant, syndicate }) and return database filters or
 * field allow-lists. Keeping the rules here (free of Express and
 * Mongoose) makes the tenant-isolation logic directly unit-testable.
 *
 * Rule of thumb: a filter built here must never be broader than the
 * caller's entitlement, and anything unresolvable must match nothing.
 */
const { isObjectId } = require("./validate");

const COUNCIL_ROLES = Object.freeze(["super_admin", "mayor", "municipal_staff"]);
const VERIFY_ROLES = Object.freeze(["enforcement_officer", "municipal_staff", "mayor", "super_admin"]);
// A well-formed ObjectId that no real document has: used so that an
// unresolvable scope matches nothing instead of silently matching all.
const NO_MATCH_ID = "000000000000000000000000";

const isCouncilRole = (role) => COUNCIL_ROLES.includes(role);
const idStr = (v) => (v === undefined || v === null ? null : String(v));
const validId = (v) => {
  const s = idStr(v);
  return s && isObjectId(s) ? s : null;
};

/** Filter restricting a query to the caller's municipality. */
function tenantScope(user, query = {}) {
  if (!user) return { tenant: NO_MATCH_ID };
  if (user.role === "super_admin") {
    const wanted = query && query.tenant;
    return isObjectId(wanted) ? { tenant: wanted } : {};
  }
  return { tenant: validId(user.tenant) || NO_MATCH_ID };
}

/** For riders and bikes: tenant scope, narrowed to own syndicate for a syndicate_admin. */
function syndicateDataScope(user, query = {}) {
  const base = tenantScope(user, query);
  if (user && user.role === "syndicate_admin") {
    return { ...base, syndicate: validId(user.syndicate) || NO_MATCH_ID };
  }
  return base;
}

/** Filter for listing Syndicate records. */
function syndicateListFilter(user, query = {}) {
  const base = tenantScope(user, query);
  if (user && user.role === "syndicate_admin") {
    return { ...base, _id: validId(user.syndicate) || NO_MATCH_ID };
  }
  return base;
}

/** Filter for one Syndicate record by id (a syndicate_admin may only address their own). */
function syndicateRecordFilter(user, id, query = {}) {
  const base = tenantScope(user, query);
  if (user && user.role === "syndicate_admin") {
    const own = validId(user.syndicate);
    if (!own || idStr(id) !== own) return { ...base, _id: NO_MATCH_ID };
  }
  return { ...base, _id: id };
}

/** Copies only allow-listed own properties. */
function pick(source, allowed) {
  const out = {};
  if (!source || typeof source !== "object") return out;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

const RIDER_BASE = ["fullName", "dateOfBirth", "nationalIdNumber", "phone", "photoUrl", "licenseNumber", "licenseExpiresAt"];
const BIKE_BASE = ["plateNumber", "make", "model", "color", "yearOfManufacture", "chassisNumber", "insuranceProvider", "insuranceExpiresAt", "technicalControlExpiresAt", "roadworthy", "rider"];

function riderWritableFields(role, creating = false) {
  if (isCouncilRole(role)) return creating ? [...RIDER_BASE, "syndicate"] : [...RIDER_BASE];
  if (role === "syndicate_admin") return [...RIDER_BASE];
  return [];
}
function bikeWritableFields(role, creating = false) {
  if (isCouncilRole(role)) return creating ? [...BIKE_BASE, "syndicate", "status"] : [...BIKE_BASE, "status"];
  if (role === "syndicate_admin") return [...BIKE_BASE];
  return [];
}
function syndicateWritableFields(role, creating = false) {
  if (isCouncilRole(role)) {
    const f = ["name", "zone", "registrationNumber", "presidentName", "presidentPhone", "contactEmail", "trustScore", "notes", "documents"];
    return creating ? [...f, "status"] : f;
  }
  if (role === "syndicate_admin") return ["presidentName", "presidentPhone", "contactEmail", "zone", "documents"];
  return [];
}
function tenantWritableFields(role) {
  if (role === "super_admin") return ["name", "slug", "region", "mayorName", "contactEmail", "contactPhone", "logoUrl", "plan", "status", "settings"];
  if (role === "mayor") return ["mayorName", "contactEmail", "contactPhone", "logoUrl", "settings"];
  return [];
}

/** Mongoose select string hiding fields a role does not need. */
function riderReadSelect(role, detail = false) {
  const parts = [];
  if (role === "enforcement_officer") parts.push("-phone");
  else if (detail) parts.push("+nationalIdNumber", "+dateOfBirth");
  return parts.join(" ");
}

/**
 * Which verification view a caller gets for a rider of `riderTenant`.
 * "full" = identity, syndicate, bike detail and the scan is logged.
 * "limited" = verdict and masked name only; nothing is written.
 */
function verificationView(user, riderTenant) {
  if (!user || !VERIFY_ROLES.includes(user.role)) return "limited";
  if (user.role === "super_admin") return "full";
  const mine = idStr(user.tenant);
  return mine && mine === idStr(riderTenant) ? "full" : "limited";
}

module.exports = {
  COUNCIL_ROLES, VERIFY_ROLES, NO_MATCH_ID, isCouncilRole,
  tenantScope, syndicateDataScope, syndicateListFilter, syndicateRecordFilter,
  pick, riderWritableFields, bikeWritableFields, syndicateWritableFields, tenantWritableFields,
  riderReadSelect, verificationView,
};
