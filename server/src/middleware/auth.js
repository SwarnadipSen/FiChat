const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const AppError = require("../utils/AppError");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.userId).select("_id username");

    if (!user) {
      throw new AppError("Unauthorized", 401);
    }

    req.user = {
      id: user._id.toString(),
      username: user.username
    };

    next();
  } catch (error) {
    next(error.name === "JsonWebTokenError" ? new AppError("Unauthorized", 401) : error);
  }
}

module.exports = authMiddleware;
