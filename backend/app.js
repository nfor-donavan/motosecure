"use strict";
/**
 * Express application (no database connection, no listening socket) so
 * it can be exercised by automated tests. server.js connects and listens.
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { notFound, errorHandler } = require("./middleware/errorHandler");
const { rejectOperatorInjection, limiters } = require("./middleware/security");

const authRoutes = require("./routes/authRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const syndicateRoutes = require("./routes/syndicateRoutes");
const riderRoutes = require("./routes/riderRoutes");
const bikeRoutes = require("./routes/bikeRoutes");
const enforcementRoutes = require("./routes/enforcementRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();

// Render (and most PaaS) terminate TLS at a proxy: trust one hop so
// req.ip and the rate limiters see the real client address.
const hops = Number.parseInt(process.env.TRUST_PROXY, 10);
app.set("trust proxy", Number.isInteger(hops) ? hops : 1);
app.set("query parser", "simple"); // no nested objects from query strings
app.disable("x-powered-by");

app.use(helmet());
if (process.env.NODE_ENV !== "test") app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(",").map((o) => o.trim()).filter((o) => o && o !== "*");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(Object.assign(new Error("Origin not allowed by CORS"), { status: 403 }));
    },
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(rejectOperatorInjection);
app.use(limiters.general);

app.get("/api/health", (req, res) => res.json({ success: true, service: "motosecure-api", status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/syndicates", syndicateRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/bikes", bikeRoutes);
app.use("/api/enforcement", enforcementRoutes);
app.use("/api/audit-logs", auditRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
