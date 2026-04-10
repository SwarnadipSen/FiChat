const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../models/User");

function getArgs() {
  const [, , usernameArg, passwordArg] = process.argv;

  const username = usernameArg || process.env.SEED_USERNAME;
  const password = passwordArg || process.env.SEED_PASSWORD;

  return { username, password };
}

async function run() {
  const { username, password } = getArgs();

  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  if (!env.mongodbDbName) {
    throw new Error("MONGODB_DB_NAME is missing in environment variables.");
  }

  if (!username || !password) {
    throw new Error(
      "Username and password are required. Use: npm run create:user -- <username> <password>"
    );
  }

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName
  });

  const existingUser = await User.findOne({ username });

  if (existingUser) {
    existingUser.password = password;
    await existingUser.save();
    console.log(`Updated password for user: ${username}`);
  } else {
    await User.create({ username, password });
    console.log(`Created user: ${username}`);
  }
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
