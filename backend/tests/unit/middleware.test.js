"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { withStubs, run } = require("./_stub");

// ---- auth middleware (real code, stubbed jwt / User / async wrapper) ----
const tokens = {};
const users = {};
const jwtStub = { verify(token, secret, opts) {
  assert.deepEqual(opts.algorithms, ["HS256"], "tokens must be verified with an explicit algorithm list");
  if (!tokens[token]) throw new Error("invalid");
  return tokens[token];
} };
const asyncHandlerStub = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const UserStub = { findById: async (id) => users[id] || null };
const auth = withStubs({ jsonwebtoken: jwtStub, "express-async-handler": asyncHandlerStub, "models/User": UserStub }, () => require("../../middleware/auth"));
const req = (header) => ({ headers: header ? { authorization: header } : {} });
const active = (extra = {}) => ({ _id: "u1", isActive: true, role: "mayor", tenant: "t1", ...extra });

test("protect: no header, wrong scheme and bad token are all 401", async () => {
  assert.equal((await run(auth.protect, req())).status, 401);
  assert.equal((await run(auth.protect, req("Basic abc"))).status, 401);
  assert.equal((await run(auth.protect, req("Bearer nope"))).status, 401);
});
test("protect: a valid token for an active user attaches the user and tenant", async () => {
  tokens.good = { id: "u1", iat: 2000 }; users.u1 = active();
  const r = req("Bearer good");
  assert.equal(await run(auth.protect, r), undefined);
  assert.equal(r.user._id, "u1");
  assert.equal(r.tenantId, "t1");
});
test("protect: deactivated or deleted users are rejected immediately, even with a valid token", async () => {
  tokens.t2 = { id: "u2", iat: 2000 }; users.u2 = active({ _id: "u2", isActive: false });
  assert.equal((await run(auth.protect, req("Bearer t2"))).status, 401);
  tokens.t3 = { id: "ghost", iat: 2000 };
  assert.equal((await run(auth.protect, req("Bearer t3"))).status, 401);
});
test("protect: tokens issued before the last password change are rejected", async () => {
  users.u4 = active({ _id: "u4", passwordChangedAt: new Date(1500 * 1000) });
  tokens.old = { id: "u4", iat: 1499 };
  tokens.same = { id: "u4", iat: 1500 };
  tokens.fresh = { id: "u4", iat: 1600 };
  assert.equal((await run(auth.protect, req("Bearer old"))).status, 401);
  assert.equal(await run(auth.protect, req("Bearer same")), undefined);
  assert.equal(await run(auth.protect, req("Bearer fresh")), undefined);
});
test("optionalAuth: anonymous passes; a supplied-but-invalid token is NOT downgraded to anonymous", async () => {
  const anon = req();
  assert.equal(await run(auth.optionalAuth, anon), undefined);
  assert.equal(anon.user, undefined);
  assert.equal((await run(auth.optionalAuth, req("Bearer nope"))).status, 401);
  const ok = req("Bearer good");
  assert.equal(await run(auth.optionalAuth, ok), undefined);
  assert.equal(ok.user._id, "u1");
});
test("authorize: only listed roles pass; missing user is 403", async () => {
  const mw = auth.authorize("mayor", "super_admin");
  assert.equal(await run(mw, { user: { role: "mayor" } }), undefined);
  assert.equal((await run(mw, { user: { role: "syndicate_admin" } })).status, 403);
  assert.equal((await run(mw, {})).status, 403);
});

// ---- security middleware (real code, stubbed rate limiter) ----
const rateLimitStub = (opts) => { const mw = (rq, rs, next) => next(); mw.opts = opts; return mw; };
const security = withStubs({ "express-rate-limit": rateLimitStub }, () => require("../../middleware/security"));

test("rejectOperatorInjection blocks operator-style keys in body, query and params", async () => {
  assert.equal((await run(security.rejectOperatorInjection, { body: { email: { $ne: "" } }, query: {}, params: {} })).status, 400);
  assert.equal((await run(security.rejectOperatorInjection, { body: {}, query: { "a.b": "x" }, params: {} })).status, 400);
  assert.equal((await run(security.rejectOperatorInjection, { body: {}, query: {}, params: { id: { $gt: "" } } })).status, 400);
  assert.equal(await run(security.rejectOperatorInjection, { body: { email: "a@b.co" }, query: { status: "active" }, params: { id: "1" } }), undefined);
});
test("rate limiters: strict budgets for credential endpoints; officers keyed per account, anonymous per IP", () => {
  const l = security.buildLimiters({ NODE_ENV: "production" });
  assert.equal(l.forgot.opts.limit, 5);
  assert.equal(l.forgot.opts.windowMs, 60 * 60 * 1000);
  assert.ok(l.login.opts.limit <= 30);
  assert.equal(l.verify.opts.limit({ user: { _id: "x" } }), 300);
  assert.equal(l.verify.opts.limit({}), 30);
  assert.equal(l.verify.opts.keyGenerator({ user: { _id: "x" }, ip: "1.2.3.4" }), "u:x");
  assert.equal(l.verify.opts.keyGenerator({ ip: "1.2.3.4" }), "1.2.3.4");
});
test("rate limiters are pass-through only in the test environment", async () => {
  const l = security.buildLimiters({ NODE_ENV: "test" });
  assert.equal(await run(l.login, {}), undefined);
  assert.equal(l.login.opts, undefined);
});

// ---- central error handler ----
const { errorHandler, notFound } = require("../../middleware/errorHandler");
const respond = (err, env = "development") => {
  const prev = process.env.NODE_ENV; process.env.NODE_ENV = env;
  const quiet = console.error; console.error = () => {};
  const res = { statusCode: 200, status(c) { this.code = c; return this; }, json(b) { this.body = b; } };
  try { errorHandler(err, { method: "GET", path: "/x" }, res, () => {}); } finally { process.env.NODE_ENV = prev; console.error = quiet; }
  return res;
};
test("errorHandler maps Mongoose/body-parser errors to safe statuses", () => {
  assert.equal(respond(Object.assign(new Error("x"), { name: "CastError", kind: "ObjectId" })).code, 404);
  assert.equal(respond(Object.assign(new Error("x"), { code: 11000, keyValue: { email: 1 } })).code, 409);
  assert.equal(respond(Object.assign(new Error("x"), { name: "ValidationError", errors: { a: { message: "bad" } } })).code, 400);
  assert.equal(respond(Object.assign(new Error("x"), { type: "entity.too.large" })).code, 413);
  assert.equal(respond(Object.assign(new Error("x"), { type: "entity.parse.failed" })).code, 400);
  assert.equal(respond(Object.assign(new Error("denied"), { status: 403 })).code, 403);
});
test("errorHandler never leaks internals in production", () => {
  const res = respond(new Error("db password is hunter2"), "production");
  assert.equal(res.code, 500);
  assert.equal(res.body.message, "Internal server error");
  assert.equal(res.body.stack, undefined);
  assert.ok(respond(new Error("boom"), "development").body.stack);
});
test("notFound produces a 404", async () => {
  const err = await run(notFound, { method: "GET", path: "/nope" });
  assert.equal(err.status, 404);
});
