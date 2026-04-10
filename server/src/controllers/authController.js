const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError("username and password are required", 400);
  }

  const user = await User.findOne({ username }).select("_id username password");

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = jwt.sign({ userId: user._id.toString() }, env.jwtSecret, {
    expiresIn: "7d"
  });

  res.json({
    success: true,
    token,
    user: {
      id: user._id.toString(),
      username: user.username
    }
  });
});

module.exports = {
  login
};
