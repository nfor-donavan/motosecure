"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { resolveVerdict, maskName, limitedRiderView } = require("../../lib/verdict");

const NOW = new Date("2026-10-27T00:00:00Z");
const past = "2026-01-01T00:00:00Z", future = "2027-01-01T00:00:00Z";

test("resolveVerdict: every status and licence combination", () => {
  assert.equal(resolveVerdict(null, NOW), "not_found");
  assert.equal(resolveVerdict({ status: "active", licenseExpiresAt: future }, NOW), "valid");
  assert.equal(resolveVerdict({ status: "active" }, NOW), "valid");
  assert.equal(resolveVerdict({ status: "active", licenseExpiresAt: past }, NOW), "expired");
  assert.equal(resolveVerdict({ status: "suspended", licenseExpiresAt: future }, NOW), "suspended");
  assert.equal(resolveVerdict({ status: "revoked", licenseExpiresAt: future }, NOW), "flagged");
  assert.equal(resolveVerdict({ status: "under_review", licenseExpiresAt: future }, NOW), "flagged");
});
test("revocation takes effect immediately: a revoked rider never verifies as valid", () => {
  for (const lic of [past, future, undefined]) assert.notEqual(resolveVerdict({ status: "revoked", licenseExpiresAt: lic }, NOW), "valid");
});
test("maskName", () => {
  assert.equal(maskName("Enow Peter"), "Enow P.");
  assert.equal(maskName("  Ashu   Collins Njie "), "Ashu N.");
  assert.equal(maskName("Madonna"), "M.");
  assert.equal(maskName(""), "");
  assert.equal(maskName(undefined), "");
});
test("limitedRiderView exposes only the badge id and a masked name", () => {
  const view = limitedRiderView({ badgeId: "MS-1", fullName: "Enow Peter", phone: "+237", status: "active", syndicate: { name: "X" }, bike: { plateNumber: "SW 1" }, _id: "id" });
  assert.deepEqual(view, { badgeId: "MS-1", fullName: "Enow P." });
});
test("the mobile offline verdict (executed from the real source) matches the server verdict", () => {
  const src = fs.readFileSync(path.join(__dirname, "../../../mobile/src/lib/offlineCache.js"), "utf8");
  const match = src.match(/export function resolveOfflineResult\(cachedRider\) \{[\s\S]*?\n\}/);
  assert.ok(match, "resolveOfflineResult not found in mobile/src/lib/offlineCache.js");
  const mobile = vm.runInNewContext(`${match[0].replace("export function", "function")}; resolveOfflineResult`, {});
  const statuses = ["active", "suspended", "revoked", "under_review"];
  const licences = [past, future, undefined, null];
  // The mobile copy evaluates "now" itself; use dates far from today so results are stable.
  const farPast = "2000-01-01T00:00:00Z", farFuture = "2999-01-01T00:00:00Z";
  for (const status of statuses) for (const lic of [farPast, farFuture, undefined, null]) {
    const rider = { status, licenseExpiresAt: lic };
    assert.equal(mobile(rider), resolveVerdict(rider, new Date()), JSON.stringify(rider));
  }
  assert.equal(mobile(null), "not_found");
  void licences;
});
