"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../../lib/validate");

test("isObjectId accepts 24 hex chars only", () => {
  assert.ok(V.isObjectId("a".repeat(24)));
  for (const bad of ["a".repeat(23), "g".repeat(24), "", null, undefined, 5, { $ne: 1 }, ["a".repeat(24)]]) assert.ok(!V.isObjectId(bad));
});
test("str trims, bounds length and rejects non-strings", () => {
  assert.equal(V.str("  hi  "), "hi");
  assert.equal(V.str("   "), undefined);
  assert.equal(V.str("x".repeat(201)), undefined);
  assert.equal(V.str({ a: 1 }), undefined);
  assert.equal(V.str(["a"]), undefined);
});
test("qstr rejects arrays and objects from query strings", () => {
  assert.equal(V.qstr("ok"), "ok");
  assert.equal(V.qstr(["a", "b"]), undefined);
  assert.equal(V.qstr({ $ne: "x" }), undefined);
});
test("isEmail", () => {
  assert.ok(V.isEmail("a@b.co"));
  for (const bad of ["", "a@b", "a b@c.com", "<x>@y.zz", "a@b.c", 5, null]) assert.ok(!V.isEmail(bad), String(bad));
});
test("passwordProblems enforces length, letter, digit and bcrypt's 72-byte limit", () => {
  assert.deepEqual(V.passwordProblems("Abcdefg1"), []);
  assert.ok(V.passwordProblems("short1").length > 0);
  assert.ok(V.passwordProblems("12345678").some((p) => p.includes("letter")));
  assert.ok(V.passwordProblems("abcdefgh").some((p) => p.includes("number")));
  assert.ok(V.passwordProblems("a1" + "x".repeat(80)).some((p) => p.includes("72")));
  assert.ok(V.passwordProblems(undefined).length > 0);
  assert.ok(V.passwordProblems({ $ne: "" }).length > 0);
});
test("containsMongoOperators flags $-keys, dotted keys, prototype keys and deep nesting", () => {
  assert.ok(V.containsMongoOperators({ email: { $ne: "" } }));
  assert.ok(V.containsMongoOperators([{ ok: 1 }, { nested: { $gt: 1 } }]));
  assert.ok(V.containsMongoOperators({ "a.b": 1 }));
  assert.ok(V.containsMongoOperators(JSON.parse('{"__proto__":{"x":1}}')));
  assert.ok(V.containsMongoOperators({ constructor: 1 }));
  let deep = {}; let cur = deep; for (let i = 0; i < 12; i++) { cur.a = {}; cur = cur.a; }
  assert.ok(V.containsMongoOperators(deep));
});
test("containsMongoOperators leaves ordinary payloads alone", () => {
  assert.ok(!V.containsMongoOperators({ email: "a@b.co", settings: { requireBikeInsurance: true }, list: [1, "x", { a: 1 }] }));
  assert.ok(!V.containsMongoOperators(null));
  assert.ok(!V.containsMongoOperators(undefined));
  assert.ok(!V.containsMongoOperators("string"));
});
test("clampInt bounds and defaults", () => {
  assert.equal(V.clampInt("50", 10, 1, 100), 50);
  assert.equal(V.clampInt("5000", 10, 1, 100), 100);
  assert.equal(V.clampInt("-3", 10, 1, 100), 1);
  assert.equal(V.clampInt("abc", 10, 1, 100), 10);
  assert.equal(V.clampInt(undefined, 10, 1, 100), 10);
});
test("normalizeBadgeId upper-cases valid ids and rejects junk", () => {
  assert.equal(V.normalizeBadgeId(" ms-4f2a9c1b "), "MS-4F2A9C1B");
  assert.equal(V.normalizeBadgeId("MS-4F2A9C1B7D2E"), "MS-4F2A9C1B7D2E");
  for (const bad of ["", "x", "MS_123", "MS-12 34", "../etc/passwd", "MS-" + "A".repeat(60), null, { a: 1 }, ["MS-AAAA"]]) assert.equal(V.normalizeBadgeId(bad), null, String(bad));
});
