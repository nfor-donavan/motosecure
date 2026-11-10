"use strict";
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const S = require("./_setup");
const { call, id, models: { AuditLog } } = S;
let w;
before(async () => { await S.connect(); });
after(async () => { await S.disconnect(); });
beforeEach(async () => { w = await S.buildWorld(); });

const entry = (action, targetId) => AuditLog.findOne({ action, ...(targetId ? { targetId } : {}) });

test("approving a syndicate records who, what, when, from/to and the municipality", async () => {
  const res = await call("patch", `/api/syndicates/${id(w.s.A3)}/status`, w.tok.mayorA, { status: "approved", notes: "Documents verified" });
  assert.equal(res.status, 200);
  const e = await entry("syndicate.approved", w.s.A3._id);
  assert.ok(e, "audit entry exists");
  assert.equal(String(e.actor), id(w.u.mayorA));
  assert.equal(e.actorRole, "mayor");
  assert.equal(e.targetLabel, "A3 Union");
  assert.deepEqual([e.metadata.from, e.metadata.to], ["pending", "approved"]);
  assert.equal(String(e.tenant), id(w.t.A));
  assert.ok(e.createdAt && e.ip);
});
test("reject and suspend are recorded; an invalid status is refused and not recorded", async () => {
  await call("patch", `/api/syndicates/${id(w.s.A3)}/status`, w.tok.mayorA, { status: "rejected" });
  await call("patch", `/api/syndicates/${id(w.s.A2)}/status`, w.tok.staffA, { status: "suspended" });
  assert.ok(await entry("syndicate.rejected", w.s.A3._id));
  assert.ok(await entry("syndicate.suspended", w.s.A2._id));
  const before = await AuditLog.countDocuments();
  assert.equal((await call("patch", `/api/syndicates/${id(w.s.A3)}/status`, w.tok.mayorA, { status: "banana" })).status, 400);
  assert.equal(await AuditLog.countDocuments(), before);
});
test("an unauthorised approval attempt fails and leaves no entry", async () => {
  assert.equal((await call("patch", `/api/syndicates/${id(w.s.A3)}/status`, w.tok.synA3, { status: "approved" })).status, 403);
  assert.equal(await entry("syndicate.approved", w.s.A3._id), null);
});
test("rider, bike, syndicate and tenant changes are all audited", async () => {
  await call("patch", `/api/riders/${id(w.r.A1)}/status`, w.tok.mayorA, { status: "suspended" });
  const st = await entry("rider.status_changed", w.r.A1._id);
  assert.deepEqual([st.metadata.from, st.metadata.to], ["active", "suspended"]);

  const rider = await call("post", "/api/riders", w.tok.synA1, { fullName: "Audited Rider", phone: "1" });
  assert.ok(await entry("rider.created", rider.body.rider._id));
  await call("patch", `/api/riders/${rider.body.rider._id}`, w.tok.synA1, { fullName: "Renamed" });
  assert.ok((await entry("rider.updated", rider.body.rider._id)).metadata.fields.includes("fullName"));

  const bike = await call("post", "/api/bikes", w.tok.synA1, { plateNumber: "AU 1" });
  assert.ok(await entry("bike.created", bike.body.bike._id));
  await call("patch", `/api/bikes/${bike.body.bike._id}`, w.tok.synA1, { color: "Red" });
  assert.ok(await entry("bike.updated", bike.body.bike._id));

  const syn = await call("post", "/api/syndicates", w.tok.mayorA, { name: "Audited Union", zone: "z" });
  assert.ok(await entry("syndicate.created", syn.body.syndicate._id));
  await call("patch", `/api/syndicates/${id(w.s.A1)}`, w.tok.synA1, { presidentName: "P" });
  assert.ok(await entry("syndicate.updated", w.s.A1._id));
  await call("patch", `/api/tenants/${id(w.t.A)}`, w.tok.mayorA, { mayorName: "M" });
  assert.ok(await entry("tenant.updated", w.t.A._id));
});
test("audit visibility: council sees only its own municipality, super_admin sees all, others are refused", async () => {
  const a = await call("get", "/api/audit-logs", w.tok.mayorA);
  const b = await call("get", "/api/audit-logs", w.tok.mayorB);
  const all = await call("get", "/api/audit-logs", w.tok.super);
  assert.ok(a.body.logs.every((e) => String(e.tenant) === id(w.t.A)));
  assert.ok(b.body.logs.every((e) => String(e.tenant) === id(w.t.B)));
  assert.equal(all.body.count, a.body.count + b.body.count);
  for (const who of ["synA1", "officerA"]) assert.equal((await call("get", "/api/audit-logs", w.tok[who])).status, 403);
});
test("the audit log is append-only through the application layer", async () => {
  const count = await AuditLog.countDocuments();
  await assert.rejects(() => AuditLog.updateOne({}, { $set: { action: "tampered" } }), /append-only/);
  await assert.rejects(() => AuditLog.updateMany({}, { $set: { action: "tampered" } }), /append-only/);
  await assert.rejects(() => AuditLog.findOneAndUpdate({}, { $set: { action: "tampered" } }), /append-only/);
  await assert.rejects(() => AuditLog.replaceOne({}, { action: "x", actor: w.u.mayorA._id }), /append-only/);
  await assert.rejects(() => AuditLog.deleteOne({}), /append-only/);
  await assert.rejects(() => AuditLog.deleteMany({}), /append-only/);
  await assert.rejects(() => AuditLog.findOneAndDelete({}), /append-only/);
  const doc = await AuditLog.findOne();
  doc.action = "tampered";
  await assert.rejects(() => doc.save(), /append-only/);
  await assert.rejects(() => doc.deleteOne(), /append-only/);
  assert.equal(await AuditLog.countDocuments(), count);
  assert.equal(await AuditLog.countDocuments({ action: "tampered" }), 0);
});
test("audit entries never contain credentials or tokens", async () => {
  await call("post", "/api/auth/login", null, { email: "mayora@test.cm", password: S.PASSWORD });
  await call("patch", `/api/syndicates/${id(w.s.A3)}/status`, w.tok.mayorA, { status: "approved" });
  const dump = JSON.stringify(await AuditLog.find().lean());
  for (const secret of ["passwordHash", S.PASSWORD, w.tok.mayorA, "resetPasswordToken"]) assert.ok(!dump.includes(secret), `audit log must not contain ${secret.slice(0, 8)}`);
});
