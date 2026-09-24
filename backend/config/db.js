const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI supplied in the environment.
 * Fails fast and loudly if the connection cannot be established,
 * since every route in this API assumes a live DB connection.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set in the environment (.env)");
    }

    const conn = await mongoose.connect(uri);

    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      console.error("[db] MongoDB connection error:", err.message);
    });

    return conn;
  } catch (err) {
    console.error(`[db] Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
