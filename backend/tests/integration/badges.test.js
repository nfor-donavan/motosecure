"use strict";
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const S = require("./_setup");
const { call, id, models: { Rider, EnforcementLog } } = S;
let w;
before(async () => { await S.connect(); });
after(async () => { await S.disconnect(); });
beforeEach(async () => { w = await S.buildWorld(); });

const verify = (badge, token) => call("get", `/api/enforcement/verify/${encodeURIComponent(badge)}`, token);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

test("QR generation: managers of the rider's own scope only; officers and other tenants/syndicates are refused", async () => {
  const ok = await call("get", `/api/riders/${id(w.r.A1)}/badge-qr`, w.tok.mayorA);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.badgeId, w.r.A1.badgeId);
  assert.ok(ok.body.qrDataUrl.startsWith("data:image/png;base64,"));
  assert.equal((await call("get", `/api/riders/${id(w.r.A1)}/badge-qr`, w.tok.synA1)).status, 200);
  assert.equal((await call("get", `/api/riders/${id(w.r.A1)}/badge-qr`, w.tok.officerA)).status, 403);
  assert.equal((await call("get", `/api/riders/${id(w.r.A1)}/badge-qr`, w.tok.synA2)).status, 404);
  assert.equal((await call("get", `/api/riders/${id(w.r.A1)}/badge-qr`, w.tok.mayorB)).status, 404);
});
test("badge ids are server-generated, well formed and immutable", async () => {
  assert.match(w.r.A1.badgeId, /^MS-[0-9A-F]{12}$/);
  const tampered = await Rider.findByIdAndUpdate(w.r.A1._id, { badgeId: "MS-TAMPER000001" }, { new: true });
  assert.equal(tampered.badgeId, w.r.A1.badgeId);
  await assert.rejects(() => Rider.create({ tenant: w.t.A._id, syndicate: w.s.A1._id, fullName: "Dup", phone: "1", badgeId: w.r.A1.badgeId }), /duplicate key|E11000/);
});
test("anonymous verification returns a limited view and writes nothing", async () => {
  const res = await verify(w.r.A1.badgeId);
  assert.equal(res.status, 200);
  assert.equal(res.body.view, "limited");
  assert.equal(res.body.result, "valid");
  assert.deepEqual(Object.keys(res.body.rider).sort(), ["badgeId", "fullName"]);
  assert.equal(res.body.rider.fullName, "Enow P.");
  assert.equal((await Rider.findById(w.r.A1._id)).verificationCount, 0);
  assert.equal(await EnforcementLog.countDocuments({ rider: w.r.A1._id }), 1);
});
test("an officer verifying a rider of their own municipality gets the full view and the scan is logged", async () => {
  const res = await verify(w.r.A1.badgeId, w.tok.officerA);
  assert.equal(res.body.view, "full");
  assert.equal(res.body.rider.fullName, "Enow Peter");
  assert.equal(String(res.body.rider.id), id(w.r.A1));
  assert.equal(res.body.rider.bike.plateNumber, "AA 111 AA");
  assert.equal((await Rider.findById(w.r.A1._id)).verificationCount, 1);
  const logs = await EnforcementLog.find({ rider: w.r.A1._id }).sort({ createdAt: -1 });
  assert.equal(logs.length, 2);
  assert.equal(String(logs[0].officer), id(w.u.officerA));
  assert.equal(logs[0].source, "live");
});
test("an officer of another municipality, and a syndicate admin, get only the limited view and nothing is written", async () => {
  for (const who of ["officerB", "synA1"]) {
    const res = await verify(w.r.A1.badgeId, w.tok[who]);
    assert.equal(res.body.view, "limited", who);
    assert.equal(res.body.rider.fullName, "Enow P.");
  }
  assert.equal((await Rider.findById(w.r.A1._id)).verificationCount, 0);
  assert.equal(await EnforcementLog.countDocuments({ rider: w.r.A1._id }), 1);
});
test("a supplied but invalid token is rejected, never silently treated as anonymous", async () => {
  assert.equal((await verify(w.r.A1.badgeId, "garbage")).status, 401);
  assert.equal((await verify(w.r.A1.badgeId, S.sign(w.u.officerA, { expiresIn: -5 }))).status, 401);
});
test("verdicts: valid, flagged, suspended, expired, not found, malformed", async () => {
  const expect = [["A1", "valid"], ["A1revoked", "flagged"], ["A1suspended", "suspended"], ["A1expired", "expired"], ["A1review", "flagged"]];
  for (const [key, result] of expect) assert.equal((await verify(w.r[key].badgeId, w.tok.officerA)).body.result, result, key);
  assert.equal((await verify("MS-ZZZZZZZZZZZZ", w.tok.officerA)).body.result, "not_found");
  assert.equal((await verify("bad id!", w.tok.officerA)).status, 400);
  assert.equal((await verify(w.r.A1.badgeId.toLowerCase(), w.tok.officerA)).body.result, "valid", "ids are case-insensitive");
});
test("revocation takes effect on the very next scan", async () => {
  assert.equal((await verify(w.r.A1.badgeId, w.tok.officerA)).body.result, "valid");
  assert.equal((await call("patch", `/api/riders/${id(w.r.A1)}/status`, w.tok.mayorA, { status: "revoked" })).status, 200);
  assert.notEqual((await verify(w.r.A1.badgeId, w.tok.officerA)).body.result, "valid");
  assert.notEqual((await verify(w.r.A1.badgeId)).body.result, "valid", "anonymous callers see the revocation too");
});
test("incident reporting is validated and restricted to the caller's municipality", async () => {
  const ok = await call("post", "/api/enforcement/incident", w.tok.officerA, { riderId: id(w.r.A1), type: "warning", severity: "high", description: "Reckless driving" });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.log.type, "warning"); assert.equal(ok.body.log.severity, "high");
  assert.equal(String(ok.body.log.officer), id(w.u.officerA));
  assert.equal((await Rider.findById(w.r.A1._id)).incidentCount, 1);
  for (const bad of [{}, { riderId: "nope" }, { riderId: id(w.r.A1), type: "verification" }, { riderId: id(w.r.A1), severity: "apocalyptic" }, { riderId: { $ne: null } }]) {
    assert.equal((await call("post", "/api/enforcement/incident", w.tok.officerA, bad)).status, 400, JSON.stringify(bad));
  }
});
test("offline sync: bounded, validated, tenant-limited, order-preserving and idempotent", async () => {
  const t = w.tok.officerA;
  assert.equal((await call("post", "/api/enforcement/sync-scans", t, { scans: "x" })).status, 400);
  const tooMany = Array.from({ length: 201 }, (_, i) => ({ badgeId: w.r.A1.badgeId, result: "valid", scanId: `n${i}` }));
  assert.equal((await call("post", "/api/enforcement/sync-scans", t, { scans: tooMany })).status, 400);

  const batch = [
    { badgeId: w.r.A1.badgeId, result: "valid", scannedAt: daysAgo(2), scanId: "s1" },
    { badgeId: w.r.A2.badgeId, result: "valid", scannedAt: daysAgo(1), scanId: "s2" },
    { badgeId: w.r.A1expired.badgeId, result: "expired", scannedAt: daysAgo(1), scanId: "s3" },
  ];
  const first = await call("post", "/api/enforcement/sync-scans", t, { scans: batch });
  assert.deepEqual([first.body.synced, first.body.duplicates, first.body.rejected], [3, 0, 0]);
  const stored = await EnforcementLog.find({ source: "offline_sync" }).sort({ createdAt: 1 });
  assert.equal(stored.length, 3);
  assert.ok(Math.abs(stored[0].createdAt - new Date(batch[0].scannedAt)) < 60000, "original scan time is preserved");
  assert.equal(String(stored[0].officer), id(w.u.officerA));

  const again = await call("post", "/api/enforcement/sync-scans", t, { scans: batch });
  assert.deepEqual([again.body.synced, again.body.duplicates], [0, 3]);
  assert.equal(await EnforcementLog.countDocuments({ source: "offline_sync" }), 3);
});
test("offline sync rejects other municipalities' riders, bad verdicts, stale and malformed entries; clamps future dates", async () => {
  const t = w.tok.officerA;
  const res = await call("post", "/api/enforcement/sync-scans", t, { scans: [
    { badgeId: w.r.B1.badgeId, result: "valid", scanId: "b1" },
    { badgeId: w.r.A1.badgeId, result: "hacked", scanId: "h1" },
    { badgeId: w.r.A1.badgeId, result: "valid", scannedAt: daysAgo(45), scanId: "old" },
    { badgeId: "../etc", result: "valid", scanId: "bad" },
    { badgeId: w.r.A1.badgeId, result: "valid", scannedAt: new Date(Date.now() + 5 * 86400000).toISOString(), scanId: "fut" },
  ] });
  assert.equal(res.body.synced, 1);
  assert.equal(res.body.rejected, 4);
  assert.equal(await EnforcementLog.countDocuments({ rider: w.r.B1._id, source: "offline_sync" }), 0);
  const fut = await EnforcementLog.findOne({ clientScanId: "fut" });
  assert.ok(fut.createdAt <= new Date(), "future timestamps are clamped to now");
  assert.equal((await call("post", "/api/enforcement/sync-scans", w.tok.synA1, { scans: [] })).status, 403);
});
test("offline snapshot contains only the caller's municipality and no contact or identity data", async () => {
  const res = await call("get", "/api/riders/offline-snapshot", w.tok.officerA);
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 6);
  assert.ok(!res.body.snapshot.some((r) => r.badgeId === w.r.B1.badgeId));
  for (const r of res.body.snapshot) assert.deepEqual(Object.keys(r).sort(), ["badgeId", "bikePlate", "fullName", "licenseExpiresAt", "status", "syndicateName"]);
});
