"use strict";
/**
 * Input validation helpers. Pure functions: no database, no framework.
 */
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const BADGE_RE = /^[A-Z0-9][A-Z0-9-]{3,39}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isObjectId = (v) => typeof v === "string" && OBJECT_ID_RE.test(v);

/** Trimmed non-empty string within a maximum length, else undefined. */
const str = (v, max = 200) => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : undefined;
};

/** Query-string values may arrive as arrays; accept strings only. */
const qstr = (v) => (typeof v === "string" ? v : undefined);

const isEmail = (v) =>
  typeof v === "string" && v.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(v);

/** Returns a list of unmet password requirements (empty = acceptable). */
function passwordProblems(pw) {
  if (typeof pw !== "string" || pw.length === 0) return ["a password"];
  const problems = [];
  if (pw.length < 8) problems.push("at least 8 characters");
  if (Buffer.byteLength(pw, "utf8") > 72) problems.push("at most 72 bytes (bcrypt limit)");
  if (!/[A-Za-z]/.test(pw)) problems.push("at least one letter");
  if (!/\d/.test(pw)) problems.push("at least one number");
  return problems;
}

/**
 * True if a value contains an object key that could be interpreted as a
 * MongoDB operator ("$..."), a dotted path, or a prototype-pollution key.
 * Excessive nesting is treated as hostile.
 */
function containsMongoOperators(value, depth = 0) {
  if (depth > 8) return true;
  if (Array.isArray(value)) return value.some((v) => containsMongoOperators(v, depth + 1));
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".") || FORBIDDEN_KEYS.has(key)) return true;
      if (containsMongoOperators(value[key], depth + 1)) return true;
    }
  }
  return false;
}

const clampInt = (v, def, min, max) => {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
};

/** Normalises a badge identifier; returns null if it is not well formed. */
function normalizeBadgeId(v) {
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  return BADGE_RE.test(t) ? t : null;
}

module.exports = { isObjectId, str, qstr, isEmail, passwordProblems, containsMongoOperators, clampInt, normalizeBadgeId };
