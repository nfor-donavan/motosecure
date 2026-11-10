"use strict";
/**
 * Shared integration-test harness. Starts an isolated in-memory MongoDB
 * (or the database named by TEST_MONGO_URI, which MUST contain "test" in
 * its name so production can never be targeted), builds a two-tenant
 * fixture world, and exposes an authenticated HTTP helper.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-only-signing-key-0123456789abcdef";
process.env.BCRYPT_ROUNDS = "4";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.CLIENT_ORIGINS = "http://localhost:5173";

// Capture outgoing email instead of sending it.
const sent = [];
const emailPath = require.resolve("../../lib/sendEmail");
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: { sendEmail: async (m) => { sent.push(m); return {}; }, isConfigured: () => true, escapeHtml: (s) => String(s) } };

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../../app");
const Tenant = require("../../models/Tenant");
const User = require("../../models/User");
const Syndicate = require("../../models/Syndicate");
const Rider = require("../../models/Rider");
const Bike = require("../../models/Bike");
const EnforcementLog = require("../../models/EnforcementLog");
const AuditLog = require("../../models/AuditLog");

const PASSWORD = "Passw0rd1";
let mem = null;

async function connect() {
  let uri = process.env.TEST_MONGO_URI;
  if (uri) {
    const dbName = new URL(uri).pathname.replace("/", "");
    if (!/test/i.test(dbName)) throw new Error('Refusing to run: TEST_MONGO_URI database name must contain "test".');
  } else {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mem = await MongoMemoryServer.create();
    uri = mem.getUri();
  }
  await mongoose.connect(uri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
async function disconnect() {
  await mongoose.disconnect();
  if (mem) await mem.stop();
}
async function wipe() {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({}); // raw driver: AuditLog guards apply to Mongoose only
}

const sign = (user, opts = {}) => jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h", ...opts });
const call = (method, path, token, body) => {
  let r = request(app)[method](path);
  if (token) r = r.set("Authorization", `Bearer ${token}`);
  return body !== undefined ? r.send(body) : r;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const future = new Date(Date.now() + 200 * 86400000);
const past = new Date(Date.now() - 30 * 86400000);

/** Two municipalities (A, B); A has three syndicates (two approved, one pending); B has one. */
async function buildWorld() {
  await wipe();
  const w = { u: {}, tok: {}, t: {}, s: {}, r: {}, b: {}, l: {} };
  w.t.A = await Tenant.create({ name: "Alpha Council", slug: "alpha", region: "North", status: "active" });
  w.t.B = await Tenant.create({ name: "Beta Council", slug: "beta", region: "South", status: "active" });
  w.s.A1 = await Syndicate.create({ tenant: w.t.A._id, name: "A1 Union", zone: "z1", status: "approved" });
  w.s.A2 = await Syndicate.create({ tenant: w.t.A._id, name: "A2 Union", zone: "z2", status: "approved" });
  w.s.A3 = await Syndicate.create({ tenant: w.t.A._id, name: "A3 Union", zone: "z3", status: "pending" });
  w.s.B1 = await Syndicate.create({ tenant: w.t.B._id, name: "B1 Union", zone: "z9", status: "approved" });

  const mk = async (key, role, tenant, syndicate) => {
    const u = new User({ fullName: `${key} user`, email: `${key.toLowerCase()}@test.cm`, role, tenant: tenant ? tenant._id : undefined, syndicate: syndicate ? syndicate._id : null });
    await u.setPassword(PASSWORD);
    await u.save();
    w.u[key] = u;
    w.tok[key] = sign(u);
  };
  await mk("super", "super_admin");
  await mk("mayorA", "mayor", w.t.A);
  await mk("staffA", "municipal_staff", w.t.A);
  await mk("officerA", "enforcement_officer", w.t.A);
  await mk("synA1", "syndicate_admin", w.t.A, w.s.A1);
  await mk("synA2", "syndicate_admin", w.t.A, w.s.A2);
  await mk("synA3", "syndicate_admin", w.t.A, w.s.A3);
  await mk("mayorB", "mayor", w.t.B);
  await mk("officerB", "enforcement_officer", w.t.B);
  await mk("synB1", "syndicate_admin", w.t.B, w.s.B1);

  const rider = (tenant, syn, name, extra = {}) =>
    Rider.create({ tenant: tenant._id, syndicate: syn._id, fullName: name, phone: "+237600000001", nationalIdNumber: `NID-${name}`, licenseExpiresAt: future, status: "active", ...extra });
  w.r.A1 = await rider(w.t.A, w.s.A1, "Enow Peter");
  w.r.A1revoked = await rider(w.t.A, w.s.A1, "Revoked Rider", { status: "revoked" });
  w.r.A1suspended = await rider(w.t.A, w.s.A1, "Suspended Rider", { status: "suspended" });
  w.r.A1expired = await rider(w.t.A, w.s.A1, "Expired Rider", { licenseExpiresAt: past });
  w.r.A1review = await rider(w.t.A, w.s.A1, "Review Rider", { status: "under_review" });
  w.r.A2 = await rider(w.t.A, w.s.A2, "Ashu Collins");
  w.r.B1 = await rider(w.t.B, w.s.B1, "Beta Rider");

  const bike = async (tenant, syn, rdr, plate) => {
    const b = await Bike.create({ tenant: tenant._id, syndicate: syn._id, rider: rdr._id, plateNumber: plate });
    await Rider.updateOne({ _id: rdr._id }, { $set: { bike: b._id } });
    return b;
  };
  w.b.A1 = await bike(w.t.A, w.s.A1, w.r.A1, "AA 111 AA");
  w.b.A2 = await bike(w.t.A, w.s.A2, w.r.A2, "AA 222 AA");
  w.b.B1 = await bike(w.t.B, w.s.B1, w.r.B1, "BB 111 BB");

  const log = (tenant, rdr, officer) => EnforcementLog.create({ tenant: tenant._id, rider: rdr._id, officer: officer._id, type: "verification", result: "valid" });
  w.l.A1 = await log(w.t.A, w.r.A1, w.u.officerA);
  w.l.A2 = await log(w.t.A, w.r.A2, w.u.officerA);
  w.l.B1 = await log(w.t.B, w.r.B1, w.u.officerB);

  for (const [tenant, actor] of [[w.t.A, w.u.mayorA], [w.t.B, w.u.mayorB]]) {
    await AuditLog.create({ tenant: tenant._id, actor: actor._id, actorName: actor.fullName, actorRole: "mayor", action: "seed.entry", targetType: "Tenant", targetLabel: tenant.name });
  }
  return w;
}
const id = (doc) => String(doc._id);
const ids = (arr, key = "_id") => arr.map((x) => String(x[key]));

module.exports = { app, mongoose, call, connect, disconnect, buildWorld, wipe, sleep, sign, sent, id, ids, PASSWORD, future, past, models: { Tenant, User, Syndicate, Rider, Bike, EnforcementLog, AuditLog }, request };
