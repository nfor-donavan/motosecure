"use strict";
/**
 * Startup configuration checks. Pure: takes an environment object and
 * returns problems (fatal) and warnings (advisory).
 */
function configProblems(env) {
  const problems = [];
  const warnings = [];
  const production = env.NODE_ENV === "production";

  if (!env.MONGO_URI) problems.push("MONGO_URI is not set.");

  const secret = env.JWT_SECRET || "";
  if (!secret) problems.push("JWT_SECRET is not set.");
  else if (secret.length < 32) problems.push("JWT_SECRET must be at least 32 characters.");
  else if (/(change[_-]?this|placeholder|example|password|secret)/i.test(secret)) problems.push("JWT_SECRET looks like a placeholder value.");

  const origins = (env.CLIENT_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (production) {
    if (origins.length === 0) warnings.push("CLIENT_ORIGINS is empty: browsers will be blocked by CORS.");
    if (origins.some((o) => o === "*")) warnings.push("Wildcard CORS origin '*' is not supported and is ignored.");
    if (origins.some((o) => /localhost|127\.0\.0\.1/.test(o))) warnings.push("CLIENT_ORIGINS includes a localhost origin in production.");
    if (!env.FRONTEND_URL || !env.FRONTEND_URL.startsWith("https://")) warnings.push("FRONTEND_URL should be an https:// URL (used in password-reset links).");
    if (!env.EMAIL_USER || !env.EMAIL_APP_PASSWORD || env.EMAIL_USER === "your-email@gmail.com") warnings.push("Email is not configured: password-reset emails will not be delivered.");
  }
  return { problems, warnings };
}
module.exports = { configProblems };
