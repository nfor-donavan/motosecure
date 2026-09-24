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

module.exports = { protect, authorize, scopeToTenant };
