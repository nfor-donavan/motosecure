const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

/**
 * Verifies the Bearer token, loads the user, and attaches it (plus a
 * convenience `req.tenantId`) to the request. Every protected route
 * downstream can trust req.user and req.tenantId to be correct.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;

  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized: no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("Not authorized: user not found or inactive");
    }

    req.user = user;
    req.tenantId = user.tenant ? user.tenant.toString() : null;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized: invalid or expired token");
  }
});

/**
 * Restricts a route to a set of roles, e.g. authorize("mayor", "super_admin").
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Forbidden: requires one of [${roles.join(", ")}]`);
    }
    next();
  };
};

/**
 * Scopes a query filter object to the caller's tenant, unless the
 * caller is a super_admin who may pass an explicit ?tenant= query param
 * to inspect a specific municipality's data.
 */
const scopeToTenant = (req) => {
  if (req.user.role === "super_admin") {
    return req.query.tenant ? { tenant: req.query.tenant } : {};
  }
  return { tenant: req.tenantId };
};

/**
 * Scopes a query filter to the caller's tenant AND, for a syndicate_admin,
 * further restricts it to only their own syndicate. Use this for any
 * model that carries a direct `syndicate` field (Rider, Bike). Mayors,
 * municipal_staff and super_admin keep the full tenant-wide view, since
 * overseeing every syndicate is their actual job; a syndicate_admin
 * should only ever see their own union's riders and bikes, not a rival
 * union's.
 */
const scopeToSyndicateData = (req) => {
  const base = scopeToTenant(req);
  if (req.user.role === "syndicate_admin") {
    if (!req.user.syndicate) {
      // A syndicate_admin with no syndicate attached (shouldn't normally
      // happen) gets no results rather than an unscoped, empty filter
      // that would accidentally return everyone else's data.
      return { ...base, syndicate: null };
    }
    return { ...base, syndicate: req.user.syndicate };
  }
  return base;
};

/**
 * Scopes a query filter to the caller's tenant AND, for a syndicate_admin,
 * restricts it to their own Syndicate record only (matched on _id rather
 * than a `syndicate` field, since this is for the Syndicate model
 * itself). Prevents one union's admin from viewing or editing another
 * union's listing.
 */
const scopeToOwnSyndicateRecord = (req) => {
  const base = scopeToTenant(req);
  if (req.user.role === "syndicate_admin") {
    return { ...base, _id: req.user.syndicate || null };
  }
  return base;
};

module.exports = {
  protect,
  authorize,
  scopeToTenant,
  scopeToSyndicateData,
  scopeToOwnSyndicateRecord,
};
