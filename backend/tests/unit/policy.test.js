"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../../lib/policy");

const A = "a".repeat(24), B = "b".repeat(24), S1 = "1".repeat(24), S2 = "2".repeat(24);
const mayorA = { role: "mayor", tenant: A };
const synAdmin = { role: "syndicate_admin", tenant: A, syndicate: S1 };

test("tenantScope: a mayor is pinned to their own municipality and cannot override it with ?tenant=", () => {
  assert.deepEqual(P.tenantScope(mayorA, { tenant: B }), { tenant: A });
});
test("tenantScope: super_admin is unscoped unless a valid ?tenant= is supplied", () => {
  const sa = { role: "super_admin" };
  assert.deepEqual(P.tenantScope(sa, {}), {});
  assert.deepEqual(P.tenantScope(sa, { tenant: B }), { tenant: B });
  assert.deepEqual(P.tenantScope(sa, { tenant: { $ne: null } }), {}, "operator objects are ignored");
  assert.deepEqual(P.tenantScope(sa, { tenant: "not-an-id" }), {});
});
test("tenantScope: a non-super user without a tenant, or no user at all, matches nothing", () => {
  assert.deepEqual(P.tenantScope({ role: "mayor" }), { tenant: P.NO_MATCH_ID });
  assert.deepEqual(P.tenantScope(null), { tenant: P.NO_MATCH_ID });
  assert.deepEqual(P.tenantScope({ role: "mayor", tenant: "garbage" }), { tenant: P.NO_MATCH_ID });
});
test("tenantScope: ObjectId-like objects are stringified", () => {
  const oid = { toString: () => A };
  assert.deepEqual(P.tenantScope({ role: "mayor", tenant: oid }), { tenant: A });
});
test("syndicateDataScope: syndicate_admin is narrowed to own syndicate; query cannot widen it", () => {
  assert.deepEqual(P.syndicateDataScope(synAdmin, { syndicate: S2, tenant: B }), { tenant: A, syndicate: S1 });
});
test("syndicateDataScope: syndicate_admin without a syndicate matches nothing", () => {
  assert.deepEqual(P.syndicateDataScope({ role: "syndicate_admin", tenant: A }), { tenant: A, syndicate: P.NO_MATCH_ID });
});
test("syndicateDataScope: council roles and officers keep the tenant-wide view", () => {
  for (const role of ["mayor", "municipal_staff", "enforcement_officer"]) {
    assert.deepEqual(P.syndicateDataScope({ role, tenant: A }), { tenant: A });
  }
});
test("syndicateRecordFilter: a syndicate_admin may address only their own record", () => {
  assert.deepEqual(P.syndicateRecordFilter(synAdmin, S1), { tenant: A, _id: S1 });
  assert.deepEqual(P.syndicateRecordFilter(synAdmin, S2), { tenant: A, _id: P.NO_MATCH_ID });
  assert.deepEqual(P.syndicateRecordFilter({ role: "syndicate_admin", tenant: A }, S1), { tenant: A, _id: P.NO_MATCH_ID });
});
test("syndicateRecordFilter: a mayor addresses any syndicate, but only inside their municipality", () => {
  assert.deepEqual(P.syndicateRecordFilter(mayorA, S2), { tenant: A, _id: S2 });
});
test("syndicateListFilter: syndicate_admin sees only their own union", () => {
  assert.deepEqual(P.syndicateListFilter(synAdmin), { tenant: A, _id: S1 });
  assert.deepEqual(P.syndicateListFilter(mayorA), { tenant: A });
});
test("pick: copies only allow-listed own properties and ignores prototype tricks", () => {
  const body = JSON.parse('{"fullName":"X","status":"active","badgeId":"MS-1","tenant":"t","__proto__":{"polluted":true}}');
  const out = P.pick(body, ["fullName", "phone"]);
  assert.deepEqual(out, { fullName: "X" });
  assert.equal({}.polluted, undefined);
});
test("rider fields: a syndicate_admin can never set status, badgeId, tenant, syndicate or counters", () => {
  for (const creating of [true, false]) {
    const f = P.riderWritableFields("syndicate_admin", creating);
    for (const banned of ["status", "badgeId", "tenant", "syndicate", "verificationCount", "incidentCount", "bike"]) {
      assert.ok(!f.includes(banned), `${banned} must not be writable (creating=${creating})`);
    }
  }
});
test("rider fields: council may choose the syndicate only when creating; nobody may set status/badgeId here", () => {
  assert.ok(P.riderWritableFields("mayor", true).includes("syndicate"));
  assert.ok(!P.riderWritableFields("mayor", false).includes("syndicate"));
  for (const r of ["mayor", "municipal_staff", "super_admin"]) {
    assert.ok(!P.riderWritableFields(r, true).includes("status"));
    assert.ok(!P.riderWritableFields(r, true).includes("badgeId"));
  }
});
test("rider/bike/syndicate/tenant fields: roles without write rights get an empty list", () => {
  for (const fn of [P.riderWritableFields, P.bikeWritableFields, P.syndicateWritableFields]) assert.deepEqual(fn("enforcement_officer"), []);
  assert.deepEqual(P.tenantWritableFields("syndicate_admin"), []);
});
test("bike fields: syndicate_admin cannot change status, syndicate or tenant", () => {
  const f = P.bikeWritableFields("syndicate_admin", true);
  for (const banned of ["status", "syndicate", "tenant"]) assert.ok(!f.includes(banned));
});
test("syndicate fields: a syndicate_admin cannot self-approve or edit trustScore/memberCount/tenant", () => {
  const f = P.syndicateWritableFields("syndicate_admin");
  for (const banned of ["status", "trustScore", "memberCount", "tenant", "notes", "name"]) assert.ok(!f.includes(banned));
  assert.ok(!P.syndicateWritableFields("mayor").includes("status"), "status changes go through the audited status route");
});
test("tenant fields: a mayor cannot change plan, status, slug or name; super_admin can", () => {
  const m = P.tenantWritableFields("mayor");
  for (const banned of ["plan", "status", "slug", "name", "region"]) assert.ok(!m.includes(banned));
  const s = P.tenantWritableFields("super_admin");
  for (const ok of ["plan", "status", "slug", "name"]) assert.ok(s.includes(ok));
});
test("riderReadSelect: sensitive fields are hidden from officers and only added for detail views", () => {
  assert.equal(P.riderReadSelect("enforcement_officer"), "-phone");
  assert.equal(P.riderReadSelect("enforcement_officer", true), "-phone");
  assert.equal(P.riderReadSelect("mayor"), "");
  assert.equal(P.riderReadSelect("mayor", true), "+nationalIdNumber +dateOfBirth");
});
test("verificationView: full only for field/council roles inside their own municipality", () => {
  assert.equal(P.verificationView(null, A), "limited");
  assert.equal(P.verificationView({ role: "enforcement_officer", tenant: A }, A), "full");
  assert.equal(P.verificationView({ role: "enforcement_officer", tenant: B }, A), "limited");
  assert.equal(P.verificationView({ role: "syndicate_admin", tenant: A, syndicate: S1 }, A), "limited");
  assert.equal(P.verificationView({ role: "super_admin" }, A), "full");
  assert.equal(P.verificationView({ role: "enforcement_officer" }, A), "limited");
});
test("isCouncilRole", () => {
  assert.ok(P.isCouncilRole("mayor") && P.isCouncilRole("municipal_staff") && P.isCouncilRole("super_admin"));
  assert.ok(!P.isCouncilRole("syndicate_admin") && !P.isCouncilRole("enforcement_officer") && !P.isCouncilRole(undefined));
});
