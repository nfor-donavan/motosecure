"use strict";
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const httpError = require("../lib/httpError");

/**
 * Resolves the user behind a Bearer token, or null if no Authorization
 * header was sent. A header that IS present but invalid is always an
 * error (never silently downgraded to anonymous).
 *
 * The user is re-read from the database on every request, so role
 * changes, deactivation and password resets take effect immediately;
 * tokens issued before the last password change are rejected.
 */
async function resolveUser(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  if (!header.startsWith("Bearer ")) throw httpError(401, "Not authorized: malformed Authorization header");

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7).trim(), process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw httpError(401, "Not authorized: invalid or expired token");
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw httpError(401, "Not authorized: user not found or inactive");
  if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw httpError(401, "Not authorized: session expired, please sign in again");
  }
  return user;
}

const attach = (req, user) => {
  req.user = user;
  req.tenantId = user.tenant ? String(user.tenant) : null;
};

/** Requires a valid token. */
const protect = asyncHandler(async (req, res, next) => {
  const user = await resolveUser(req);
  if (!user) throw httpError(401, "Not authorized: no token provided");
  attach(req, user);
  next();
});

/** Accepts anonymous callers, but validates a token if one is supplied. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const user = await resolveUser(req);
  if (user) attach(req, user);
  next();
});

/** Restricts a route to the listed roles (use after protect). */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(httpError(403, "Forbidden: you do not have permission to perform this action"));
  }
  next();
};

module.exports = { protect, optionalAuth, authorize };
