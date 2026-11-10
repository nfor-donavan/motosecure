"use strict";
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const S = require("./_setup");
const { call, models: { User, Syndicate, AuditLog } } = S;
let w;

before(async () => { await S.connect(); });
after(async () => { await S.disconnect(); });
beforeEach(async () => { w = await S.buildWorld(); S.sent.length = 0; });

test("login succeeds and never returns secrets", async () => {
  const res = await call("post", "/api/auth/login", null, { email: "mayora@test.cm", password: S.PASSWORD });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  for (const k of ["passwordHash", "failedLoginCount", "lockUntil", "passwordChangedAt", "resetPasswordTokenHash"]) assert.equal(res.body.user[k], undefined, k);
});
test("wrong password and unknown email give the same generic 401", async () => {
  const a = await call("post", "/api/auth/login", null, { email: "mayora@test.cm", password: "WrongPass1" });
  const b = await call("post", "/api/auth/login", null, { email: "nobody@test.cm", password: "WrongPass1" });
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.equal(a.body.message, b.body.message);
});
test("operator injection and non-string credentials are rejected", async () => {
  assert.equal((await call("post", "/api/auth/login", null, { email: { $ne: "" }, password: "x" })).status, 400);
  assert.equal((await call("post", "/api/auth/login", null, { email: "mayora@test.cm", password: { $ne: "" } })).status, 400);
  assert.equal((await call("post", "/api/auth/login", null, { email: "mayora@test.cm", password: 12345678 })).status, 400);
});
test("account locks after 5 failures, even the correct password is refused, then recovers after the lock expires", async () => {
  for (let i = 0; i < 5; i++) await call("post", "/api/auth/login", null, { email: "staffa@test.cm", password: "WrongPass1" });
  const locked = await call("post", "/api/auth/login", null, { email: "staffa@test.cm", password: S.PASSWORD });
  assert.equal(locked.status, 401);
  assert.ok(await AuditLog.findOne({ action: "auth.account_locked" }));
  await User.updateOne({ email: "staffa@test.cm" }, { $set: { lockUntil: new Date(Date.now() - 1000) } });
  assert.equal((await call("post", "/api/auth/login", null, { email: "staffa@test.cm", password: S.PASSWORD })).status, 200);
});
test("syndicate registration validates input and creates a PENDING syndicate", async () => {
  const good = { tenantSlug: "alpha", syndicateName: "New Union", zone: "Z", presidentName: "P", presidentPhone: "1", adminFullName: "Admin", phone: "2", email: "new@test.cm", password: "Strong1pass" };
  assert.equal((await call("post", "/api/auth/register-syndicate", null, { ...good, password: "weak" })).status, 400);
  assert.equal((await call("post", "/api/auth/register-syndicate", null, { ...good, email: "not-an-email" })).status, 400);
  assert.equal((await call("post", "/api/auth/register-syndicate", null, { ...good, tenantSlug: "nowhere" })).status, 404);
  assert.equal((await call("post", "/api/auth/register-syndicate", null, { ...good, syndicateName: undefined })).status, 400);
  const ok = await call("post", "/api/auth/register-syndicate", null, good);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.syndicate.status, "pending");
  assert.equal(ok.body.user.role, "syndicate_admin");
  assert.equal(ok.body.user.passwordHash, undefined);
  assert.equal((await call("post", "/api/auth/register-syndicate", null, good)).status, 409);
  assert.ok(await AuditLog.findOne({ action: "syndicate.registered" }));
});
test("registration cannot target a suspended municipality", async () => {
  await S.models.Tenant.updateOne({ slug: "beta" }, { $set: { status: "suspended" } });
  const res = await call("post", "/api/auth/register-syndicate", null, { tenantSlug: "beta", syndicateName: "X", zone: "Z", presidentName: "P", presidentPhone: "1", adminFullName: "A", phone: "2", email: "x@test.cm", password: "Strong1pass" });
  assert.equal(res.status, 404);
});
test("password reset: generic response, single-use token, old sessions and old password die", async () => {
  const unknown = await call("post", "/api/auth/forgot-password", null, { email: "ghost@test.cm" });
  assert.equal(unknown.status, 200);
  assert.equal(S.sent.length, 0, "no email for unknown accounts");

  const known = await call("post", "/api/auth/forgot-password", null, { email: "mayora@test.cm" });
  assert.equal(known.status, 200);
  assert.equal(known.body.message, unknown.body.message);
  assert.equal(S.sent.length, 1);
  const token = /token=([a-f0-9]{64})/.exec(S.sent[0].text)[1];

  assert.equal((await call("post", "/api/auth/reset-password", null, { email: "mayora@test.cm", token, newPassword: "short" })).status, 400);
  assert.equal((await call("post", "/api/auth/reset-password", null, { email: "mayora@test.cm", token: "0".repeat(64), newPassword: "NewPassw0rd" })).status, 400);

  await S.sleep(1100); // token timestamps have 1-second resolution
  const reset = await call("post", "/api/auth/reset-password", null, { email: "mayora@test.cm", token, newPassword: "NewPassw0rd" });
  assert.equal(reset.status, 200);
  assert.equal((await call("post", "/api/auth/reset-password", null, { email: "mayora@test.cm", token, newPassword: "Another1Pass" })).status, 400, "token is single-use");
  assert.equal((await call("get", "/api/auth/me", w.tok.mayorA)).status, 401, "sessions issued before the reset are invalid");
  assert.equal((await call("post", "/api/auth/login", null, { email: "mayora@test.cm", password: S.PASSWORD })).status, 401);
  assert.equal((await call("post", "/api/auth/login", null, { email: "mayora@test.cm", password: "NewPassw0rd" })).status, 200);
  assert.ok(await AuditLog.findOne({ action: "auth.password_reset_completed" }));
});
test("an expired reset token is refused", async () => {
  await call("post", "/api/auth/forgot-password", null, { email: "staffa@test.cm" });
  const token = /token=([a-f0-9]{64})/.exec(S.sent[0].text)[1];
  await User.updateOne({ email: "staffa@test.cm" }, { $set: { resetPasswordExpires: new Date(Date.now() - 1000) } });
  assert.equal((await call("post", "/api/auth/reset-password", null, { email: "staffa@test.cm", token, newPassword: "NewPassw0rd" })).status, 400);
});
test("token handling: missing, malformed, wrongly signed, expired and deactivated-user tokens are all 401", async () => {
  assert.equal((await call("get", "/api/auth/me")).status, 401);
  assert.equal((await call("get", "/api/auth/me", "garbage")).status, 401);
  assert.equal((await call("get", "/api/auth/me", S.sign(w.u.mayorA, {}).slice(0, -3) + "abc")).status, 401);
  assert.equal((await call("get", "/api/auth/me", S.sign(w.u.mayorA, { expiresIn: -10 }))).status, 401);
  assert.equal((await call("get", "/api/auth/me", w.tok.mayorA)).status, 200);
  await User.updateOne({ _id: w.u.mayorA._id }, { $set: { isActive: false } });
  assert.equal((await call("get", "/api/auth/me", w.tok.mayorA)).status, 401);
});
test("/me returns the caller's own profile and municipality", async () => {
  const res = await call("get", "/api/auth/me", w.tok.officerA);
  assert.equal(res.body.user.email, "officera@test.cm");
  assert.equal(String(res.body.tenant._id), S.id(w.t.A));
});
test("CORS: unknown origins are refused, the configured origin is allowed", async () => {
  assert.equal((await S.request(S.app).get("/api/health").set("Origin", "https://evil.example")).status, 403);
  assert.equal((await S.request(S.app).get("/api/health").set("Origin", "http://localhost:5173")).status, 200);
});
test("hardening: no x-powered-by, nosniff, JSON 404s, safe handling of bad ids and oversized bodies", async () => {
  const h = await S.request(S.app).get("/api/health");
  assert.equal(h.headers["x-powered-by"], undefined);
  assert.equal(h.headers["x-content-type-options"], "nosniff");
  assert.equal((await call("get", "/api/nope", w.tok.mayorA)).status, 404);
  assert.equal((await call("get", "/api/riders/not-an-id", w.tok.mayorA)).status, 404);
  const big = await call("post", "/api/auth/login", null, { email: "a@b.co", password: "x".repeat(200000) });
  assert.equal(big.status, 413);
});
