"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { configProblems } = require("../../lib/config");

const good = { MONGO_URI: "mongodb://x/y", JWT_SECRET: "a3f9c1d7e5b24680a3f9c1d7e5b24680a3f9c1d7e5b2" };

test("a complete configuration has no problems", () => assert.deepEqual(configProblems(good).problems, []));
test("missing MONGO_URI or JWT_SECRET is fatal", () => {
  assert.ok(configProblems({ JWT_SECRET: good.JWT_SECRET }).problems.some((p) => p.includes("MONGO_URI")));
  assert.ok(configProblems({ MONGO_URI: "x" }).problems.some((p) => p.includes("JWT_SECRET")));
});
test("short or placeholder JWT secrets are rejected", () => {
  assert.ok(configProblems({ ...good, JWT_SECRET: "short" }).problems.length > 0);
  assert.ok(configProblems({ ...good, JWT_SECRET: "change_this_to_a_long_random_string_please" }).problems.length > 0);
});
test("production warns about localhost/missing origins, http reset links and unconfigured email", () => {
  const w = configProblems({ ...good, NODE_ENV: "production", CLIENT_ORIGINS: "http://localhost:5173,*", FRONTEND_URL: "http://x" }).warnings.join(" | ");
  for (const needle of ["localhost", "Wildcard", "https", "Email is not configured"]) assert.ok(w.includes(needle), needle);
  assert.ok(configProblems({ ...good, NODE_ENV: "production" }).warnings.some((x) => x.includes("CLIENT_ORIGINS is empty")));
});
test("development produces no advisory warnings", () => assert.deepEqual(configProblems({ ...good, NODE_ENV: "development" }).warnings, []));
