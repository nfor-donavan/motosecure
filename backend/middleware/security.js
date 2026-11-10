"use strict";
const rateLimit = require("express-rate-limit");
const { containsMongoOperators } = require("../lib/validate");
const httpError = require("../lib/httpError");

/** Rejects any request whose body, query or params carry operator-style keys. */
function rejectOperatorInjection(req, res, next) {
  if (containsMongoOperators(req.body) || containsMongoOperators(req.query) || containsMongoOperators(req.params)) {
    return next(httpError(400, "Invalid request: keys may not start with '$' or contain '.'"));
  }
  next();
}

function buildLimiters(env = process.env) {
  const disabled = env.NODE_ENV === "test" || env.RATE_LIMIT_DISABLED === "true";
  const make = (opts) =>
    disabled
      ? (req, res, next) => next()
      : rateLimit({
          standardHeaders: true,
          legacyHeaders: false,
          handler: (req, res, next) => next(httpError(429, "Too many requests. Please try again later.")),
          ...opts,
        });
  return {
    general: make({ windowMs: 60 * 1000, limit: 300 }),
    login: make({ windowMs: 15 * 60 * 1000, limit: 30 }),
    forgot: make({ windowMs: 60 * 60 * 1000, limit: 5 }),
    register: make({ windowMs: 60 * 60 * 1000, limit: 10 }),
    // Authenticated officers are keyed by account (many officers share a
    // mobile-carrier IP); anonymous callers are keyed by IP and kept low.
    verify: make({
      windowMs: 60 * 1000,
      limit: (req) => (req.user ? 300 : 30),
      keyGenerator: (req) => (req.user ? `u:${req.user._id}` : req.ip),
    }),
  };
}

module.exports = { rejectOperatorInjection, buildLimiters, limiters: buildLimiters() };
