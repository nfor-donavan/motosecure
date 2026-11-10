"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const S = require("./_setup");
const { call, id } = S;
let w;
before(async () => { await S.connect(); w = await S.buildWorld(); });
after(async () => { await S.disconnect(); });

const ROLES = ["super", "mayorA", "staffA", "synA1", "officerA"];
const COUNCIL = ["super", "mayorA", "staffA"];
// [method, label, path(), body(), roles that must be ALLOWED] - everyone else must get 403.
const rows = [
  ["GET", "/api/audit-logs", () => "/api/audit-logs", null, COUNCIL],
  ["GET", "/api/riders/offline-snapshot", () => "/api/riders/offline-snapshot", null, [...COUNCIL, "officerA"]],
  ["POST", "/api/syndicates", () => "/api/syndicates", () => ({ name: "Z Union", zone: "z", tenant: id(w.t.A) }), COUNCIL],
  ["PATCH", "/api/syndicates/:id/status", () => `/api/syndicates/${id(w.s.A2)}/status`, () => ({ status: "approved" }), COUNCIL],
  ["PATCH", "/api/riders/:id/status", () => `/api/riders/${id(w.r.A2)}/status`, () => ({ status: "active" }), COUNCIL],
  ["POST", "/api/riders", () => "/api/riders", () => ({ fullName: "N", phone: "1", syndicate: id(w.s.A1) }), [...COUNCIL, "synA1"]],
  ["GET", "/api/riders/:id/badge-qr", () => `/api/riders/${id(w.r.A1)}/badge-qr`, null, [...COUNCIL, "synA1"]],
  ["POST", "/api/bikes", () => "/api/bikes", () => ({ plateNumber: "ZZ 000 ZZ", syndicate: id(w.s.A1) }), [...COUNCIL, "synA1"]],
  ["POST", "/api/tenants", () => "/api/tenants", () => ({ name: "T", slug: `t-${Date.now()}`, region: "r" }), ["super"]],
  ["PATCH", "/api/tenants/:id", () => `/api/tenants/${id(w.t.A)}`, () => ({ mayorName: "M" }), ["super", "mayorA"]],
  ["POST", "/api/enforcement/incident", () => "/api/enforcement/incident", () => ({ riderId: id(w.r.A1), type: "warning" }), [...COUNCIL, "officerA"]],
  ["POST", "/api/enforcement/sync-scans", () => "/api/enforcement/sync-scans", () => ({ scans: [] }), [...COUNCIL, "officerA"]],
];

for (const [method, label, path, body, allowed] of rows) {
  test(`${method} ${label}: unauthenticated -> 401`, async () => {
    assert.equal((await call(method.toLowerCase(), path(), null, body && body())).status, 401);
  });
  for (const role of ROLES) {
    const ok = allowed.includes(role);
    test(`${method} ${label}: ${role} ${ok ? "is allowed" : "is forbidden (403)"}`, async () => {
      const res = await call(method.toLowerCase(), path(), w.tok[role], body && body());
      if (ok) assert.ok(![401, 403].includes(res.status), `expected access, got ${res.status}: ${JSON.stringify(res.body)}`);
      else assert.equal(res.status, 403);
    });
  }
}

test("every list/read endpoint requires authentication", async () => {
  for (const p of ["/api/riders", "/api/bikes", "/api/syndicates", "/api/enforcement/logs", "/api/enforcement/stats", "/api/tenants", "/api/auth/me", `/api/riders/${id(w.r.A1)}`]) {
    assert.equal((await call("get", p)).status, 401, p);
  }
});
test("public endpoints are reachable and expose only minimal council data", async () => {
  assert.equal((await call("get", "/api/health")).status, 200);
  const pub = await call("get", "/api/tenants/public");
  assert.equal(pub.status, 200);
  for (const t of pub.body.tenants) assert.deepEqual(Object.keys(t).sort(), ["_id", "name", "region", "slug"]);
  const look = await call("get", "/api/tenants/lookup/alpha");
  assert.equal(look.body.tenant.slug, "alpha");
  assert.equal(look.body.tenant.plan, undefined);
});
