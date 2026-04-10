const mongoose = require("mongoose");
const env = require("./env");

async function connectDatabase() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  if (!env.mongodbDbName) {
    throw new Error("MONGODB_DB_NAME is missing in environment variables.");
  }

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName
  });
  console.log("MongoDB connected");
}

module.exports = connectDatabase;
