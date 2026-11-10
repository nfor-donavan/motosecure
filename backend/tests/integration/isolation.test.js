"use strict";
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const S = require("./_setup");
const { call, id, ids, models: { Rider, Bike, Syndicate, Tenant, EnforcementLog, AuditLog } } = S;
let w;
before(async () => { await S.connect(); });
after(async () => { await S.disconnect(); });
beforeEach(async () => { w = await S.buildWorld(); });

test("municipality A's mayor sees only A's data in every list", async () => {
  const t = w.tok.mayorA;
  const riders = await call("get", "/api/riders", t);
  assert.equal(riders.body.count, 6);
  assert.ok(!ids(riders.body.riders).includes(id(w.r.B1)));
  assert.equal((await call("get", "/api/bikes", t)).body.count, 2);
  assert.equal((await call("get", "/api/syndicates", t)).body.count, 3);
  const logs = await call("get", "/api/enforcement/logs", t);
  assert.equal(logs.body.count, 2);
  assert.ok(!ids(logs.body.logs).includes(id(w.l.B1)));
  const audit = await call("get", "/api/audit-logs", t);
  assert.ok(audit.body.logs.length >= 1);
  for (const e of audit.body.logs) assert.equal(String(e.tenant), id(w.t.A));
  const stats = await call("get", "/api/enforcement/stats", t);
  assert.equal(stats.body.stats.totalRiders, 6);
  assert.equal(stats.body.stats.totalBikes, 2);
  assert.equal(stats.body.stats.totalSyndicates, 3);
  const tenants = await call("get", "/api/tenants", t);
  assert.deepEqual(ids(tenants.body.tenants), [id(w.t.A)]);
});
test("guessing B's record ids from A returns 404 for every read and write, and nothing changes", async () => {
  const t = w.tok.mayorA;
  const attempts = [
    ["get", `/api/riders/${id(w.r.B1)}`], ["get", `/api/riders/${id(w.r.B1)}/badge-qr`],
    ["patch", `/api/riders/${id(w.r.B1)}`, { fullName: "Hacked" }], ["patch", `/api/riders/${id(w.r.B1)}/status`, { status: "revoked" }],
    ["patch", `/api/bikes/${id(w.b.B1)}`, { color: "Hacked" }],
    ["get", `/api/syndicates/${id(w.s.B1)}`], ["patch", `/api/syndicates/${id(w.s.B1)}`, { name: "Hacked" }], ["patch", `/api/syndicates/${id(w.s.B1)}/status`, { status: "suspended" }],
  ];
  for (const [m, p, b] of attempts) assert.equal((await call(m, p, t, b)).status, 404, `${m} ${p}`);
  assert.equal((await Rider.findById(w.r.B1._id)).fullName, "Beta Rider");
  assert.equal((await Rider.findById(w.r.B1._id)).status, "active");
  assert.equal((await Syndicate.findById(w.s.B1._id)).name, "B1 Union");
  assert.equal((await Syndicate.findById(w.s.B1._id)).status, "approved");
  assert.equal((await Bike.findById(w.b.B1._id)).color, undefined);
});
test("an officer cannot log an incident against another municipality's rider", async () => {
  const res = await call("post", "/api/enforcement/incident", w.tok.officerA, { riderId: id(w.r.B1), type: "incident", severity: "high" });
  assert.equal(res.status, 404);
  assert.equal((await Rider.findById(w.r.B1._id)).incidentCount, 0);
  assert.equal(await EnforcementLog.countDocuments({ rider: w.r.B1._id, type: "incident" }), 0);
});
test("a mayor cannot edit another municipality, and ?tenant= is ignored for non-super users", async () => {
  assert.equal((await call("patch", `/api/tenants/${id(w.t.B)}`, w.tok.mayorA, { mayorName: "X" })).status, 403);
  const res = await call("get", `/api/riders?tenant=${id(w.t.B)}`, w.tok.mayorA);
  assert.equal(res.body.count, 6);
  assert.ok(!ids(res.body.riders).includes(id(w.r.B1)));
});
test("super_admin sees everything by default and can scope with ?tenant=", async () => {
  assert.equal((await call("get", "/api/riders", w.tok.super)).body.count, 7);
  const b = await call("get", `/api/riders?tenant=${id(w.t.B)}`, w.tok.super);
  assert.equal(b.body.count, 1);
  assert.equal(ids(b.body.riders)[0], id(w.r.B1));
});
test("tenant values smuggled in request bodies are ignored", async () => {
  const syn = await call("post", "/api/syndicates", w.tok.mayorA, { name: "Injected Union", zone: "z", tenant: id(w.t.B) });
  assert.equal(syn.status, 201);
  assert.equal(String(syn.body.syndicate.tenant), id(w.t.A));
  const rider = await call("post", "/api/riders", w.tok.synA1, { fullName: "Smuggler", phone: "1", tenant: id(w.t.B), syndicate: id(w.s.B1) });
  assert.equal(rider.status, 201);
  assert.equal(String(rider.body.rider.tenant), id(w.t.A));
  assert.equal(String(rider.body.rider.syndicate), id(w.s.A1));
  assert.equal((await call("post", "/api/bikes", w.tok.mayorA, { plateNumber: "XX 1", syndicate: id(w.s.B1) })).status, 404);
});
test("syndicate A1's admin sees only A1's riders, bikes, syndicate, logs and stats", async () => {
  const t = w.tok.synA1;
  const riders = await call("get", "/api/riders", t);
  assert.equal(riders.body.count, 5);
  for (const r of riders.body.riders) assert.equal(String(r.syndicate._id), id(w.s.A1));
  assert.equal((await call("get", `/api/riders?syndicate=${id(w.s.A2)}`, t)).body.count, 5, "?syndicate= cannot widen the scope");
  assert.equal((await call("get", "/api/bikes", t)).body.count, 1);
  const syns = await call("get", "/api/syndicates", t);
  assert.deepEqual(ids(syns.body.syndicates), [id(w.s.A1)]);
  const logs = await call("get", "/api/enforcement/logs", t);
  assert.deepEqual(ids(logs.body.logs), [id(w.l.A1)]);
  const stats = (await call("get", "/api/enforcement/stats", t)).body.stats;
  assert.equal(stats.totalRiders, 5); assert.equal(stats.totalBikes, 1); assert.equal(stats.totalSyndicates, 1); assert.equal(stats.pendingSyndicates, 0);
});
test("syndicate A1's admin cannot read or modify syndicate A2's records", async () => {
  const t = w.tok.synA1;
  for (const [m, p, b] of [
    ["get", `/api/riders/${id(w.r.A2)}`], ["patch", `/api/riders/${id(w.r.A2)}`, { fullName: "Hacked" }], ["get", `/api/riders/${id(w.r.A2)}/badge-qr`],
    ["patch", `/api/bikes/${id(w.b.A2)}`, { color: "Hacked" }],
    ["get", `/api/syndicates/${id(w.s.A2)}`], ["patch", `/api/syndicates/${id(w.s.A2)}`, { presidentName: "Hacked" }],
  ]) assert.equal((await call(m, p, t, b)).status, 404, `${m} ${p}`);
  assert.equal((await Rider.findById(w.r.A2._id)).fullName, "Ashu Collins");
  assert.equal((await Syndicate.findById(w.s.A2._id)).presidentName, undefined);
  assert.equal((await Syndicate.findById(w.s.A1._id)).presidentName, undefined, "A1 must not be modified by a request aimed at A2");
});
test("a syndicate_admin cannot self-approve or alter protected syndicate fields", async () => {
  const res = await call("patch", `/api/syndicates/${id(w.s.A3)}`, w.tok.synA3, { status: "approved", trustScore: 100, tenant: id(w.t.B), name: "Renamed", presidentName: "Pat" });
  assert.equal(res.status, 200);
  const s = await Syndicate.findById(w.s.A3._id);
  assert.equal(s.status, "pending"); assert.equal(s.name, "A3 Union"); assert.notEqual(s.trustScore, 100);
  assert.equal(String(s.tenant), id(w.t.A));
  assert.equal(s.presidentName, "Pat");
  assert.equal((await call("patch", `/api/syndicates/${id(w.s.A3)}/status`, w.tok.synA3, { status: "approved" })).status, 403);
});
test("an unapproved syndicate cannot enroll riders or bikes", async () => {
  assert.equal((await call("post", "/api/riders", w.tok.synA3, { fullName: "X", phone: "1" })).status, 403);
  assert.equal((await call("post", "/api/bikes", w.tok.synA3, { plateNumber: "NO 1" })).status, 403);
  await call("patch", `/api/syndicates/${id(w.s.A3)}/status`, w.tok.mayorA, { status: "approved" });
  assert.equal((await call("post", "/api/riders", w.tok.synA3, { fullName: "X", phone: "1" })).status, 201);
});
test("mass assignment: a syndicate_admin cannot choose status, badge id, counters, tenant or syndicate", async () => {
  const res = await call("post", "/api/riders", w.tok.synA1, { fullName: "Forger", phone: "1", status: "active", badgeId: "MS-FORGED000000", verificationCount: 99, incidentCount: 5, syndicate: id(w.s.A2), tenant: id(w.t.B) });
  assert.equal(res.status, 201);
  const r = await Rider.findById(res.body.rider._id);
  assert.equal(r.status, "under_review");
  assert.match(r.badgeId, /^MS-[0-9A-F]{12}$/);
  assert.notEqual(r.badgeId, "MS-FORGED000000");
  assert.equal(r.verificationCount, 0); assert.equal(r.incidentCount, 0);
  assert.equal(String(r.syndicate), id(w.s.A1)); assert.equal(String(r.tenant), id(w.t.A));
});
test("mass assignment on update: status, badge id, tenant and syndicate cannot be changed through PATCH", async () => {
  const before = await Rider.findById(w.r.A1._id);
  const res = await call("patch", `/api/riders/${id(w.r.A1)}`, w.tok.synA1, { fullName: "Renamed", status: "revoked", badgeId: "MS-TAMPERED0000", tenant: id(w.t.B), syndicate: id(w.s.A2) });
  assert.equal(res.status, 200);
  const after = await Rider.findById(w.r.A1._id);
  assert.equal(after.fullName, "Renamed");
  assert.equal(after.status, "active"); assert.equal(after.badgeId, before.badgeId);
  assert.equal(String(after.tenant), id(w.t.A)); assert.equal(String(after.syndicate), id(w.s.A1));
  const council = await call("patch", `/api/riders/${id(w.r.A1)}`, w.tok.mayorA, { status: "revoked" });
  assert.equal(council.status, 200);
  assert.equal((await Rider.findById(w.r.A1._id)).status, "active", "status changes must use the audited /status route");
});
test("a mayor cannot change plan, status, slug or name of their municipality", async () => {
  const res = await call("patch", `/api/tenants/${id(w.t.A)}`, w.tok.mayorA, { mayorName: "New Mayor", plan: "premium", status: "suspended", slug: "hijack", name: "Renamed" });
  assert.equal(res.status, 200);
  const t = await Tenant.findById(w.t.A._id);
  assert.equal(t.mayorName, "New Mayor");
  assert.equal(t.plan, "trial"); assert.equal(t.status, "active"); assert.equal(t.slug, "alpha"); assert.equal(t.name, "Alpha Council");
});
test("a council cannot move a syndicate to another municipality through PATCH", async () => {
  await call("patch", `/api/syndicates/${id(w.s.A2)}`, w.tok.mayorA, { tenant: id(w.t.B), status: "suspended", zone: "moved" });
  const s = await Syndicate.findById(w.s.A2._id);
  assert.equal(String(s.tenant), id(w.t.A)); assert.equal(s.status, "approved"); assert.equal(s.zone, "moved");
});
test("a bike can only be linked to a rider of the same syndicate", async () => {
  const foreign = await call("post", "/api/bikes", w.tok.synA1, { plateNumber: "LK 1", rider: id(w.r.A2) });
  assert.equal(foreign.status, 404);
  assert.equal((await Rider.findById(w.r.A2._id)).bike.toString(), id(w.b.A2), "other syndicate's rider must be untouched");
  assert.equal((await call("post", "/api/bikes", w.tok.synA1, { plateNumber: "LK 2", rider: id(w.r.B1) })).status, 404);
  const own = await call("post", "/api/bikes", w.tok.synA1, { plateNumber: "LK 3", rider: id(w.r.A1review) });
  assert.equal(own.status, 201);
  assert.equal((await Rider.findById(w.r.A1review._id)).bike.toString(), own.body.bike._id);
  const move = await call("patch", `/api/bikes/${own.body.bike._id}`, w.tok.synA1, { rider: id(w.r.A2) });
  assert.equal(move.status, 404);
});
test("sensitive personal fields are minimised by role", async () => {
  const list = await call("get", "/api/riders", w.tok.mayorA);
  for (const r of list.body.riders) { assert.equal(r.nationalIdNumber, undefined); assert.equal(r.dateOfBirth, undefined); }
  const mayorDetail = await call("get", `/api/riders/${id(w.r.A1)}`, w.tok.mayorA);
  assert.equal(mayorDetail.body.rider.nationalIdNumber, "NID-Enow Peter");
  const officerList = await call("get", "/api/riders", w.tok.officerA);
  for (const r of officerList.body.riders) { assert.equal(r.phone, undefined); assert.equal(r.nationalIdNumber, undefined); }
  const officerDetail = await call("get", `/api/riders/${id(w.r.A1)}`, w.tok.officerA);
  assert.equal(officerDetail.body.rider.phone, undefined);
  assert.equal(officerDetail.body.rider.nationalIdNumber, undefined);
});
test("operator injection is rejected or neutralised in bodies and queries", async () => {
  assert.equal((await call("post", "/api/riders", w.tok.synA1, { fullName: { $gt: "" }, phone: "1" })).status, 400);
  const q1 = await call("get", "/api/riders?status[$ne]=x", w.tok.mayorA);
  assert.equal(q1.status, 200); assert.equal(q1.body.count, 6);
  const q2 = await call("get", "/api/riders?status=active&status=revoked", w.tok.mayorA);
  assert.equal(q2.status, 200); assert.equal(q2.body.count, 6);
  assert.equal((await call("get", "/api/riders?syndicate[$ne]=x", w.tok.mayorA)).body.count, 6);
});
