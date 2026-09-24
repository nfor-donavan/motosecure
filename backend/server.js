require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const syndicateRoutes = require("./routes/syndicateRoutes");
const riderRoutes = require("./routes/riderRoutes");
const bikeRoutes = require("./routes/bikeRoutes");
const enforcementRoutes = require("./routes/enforcementRoutes");

connectDB();

const app = express();

app.use(helmet());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Basic rate limiting on the public verification + auth endpoints
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use("/api/enforcement/verify", apiLimiter);
app.use("/api/auth", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({ success: true, service: "motosecure-api", status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/syndicates", syndicateRoutes);
app.use("/api/riders", riderRoutes);
app.use("/api/bikes", bikeRoutes);
app.use("/api/enforcement", enforcementRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[server] MotoSecure API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});

module.exports = app;
