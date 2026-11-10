require("dotenv").config();
const { configProblems } = require("./lib/config");

const { problems, warnings } = configProblems(process.env);
warnings.forEach((w) => console.warn(`[config] warning: ${w}`));
if (problems.length) {
  problems.forEach((p) => console.error(`[config] error: ${p}`));
  console.error("[config] refusing to start with an unsafe or incomplete configuration.");
  process.exit(1);
}

const connectDB = require("./config/db");
const app = require("./app");

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[server] MotoSecure API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});
