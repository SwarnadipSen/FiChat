const mongoose = require("mongoose");
const Room = require("../models/Room");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const createRoom = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new AppError("Room name is required", 400);
  }

  let roomCode;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    roomCode = generateRoomCode();
    const existing = await Room.findOne({ code: roomCode });
    if (!existing) break;
    attempts++;
  }

  if (attempts === maxAttempts) {
    throw new AppError("Failed to generate unique room code. Please try again.", 500);
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);
  const room = await Room.create({
    name: name.trim(),
    code: roomCode,
    users: [userId]
  });

  res.status(201).json({
    success: true,
    room: {
      id: room._id.toString(),
      name: room.name,
      code: room.code,
      users: room.users.map((id) => id.toString())
    }
  });
});

const joinRoom = asyncHandler(async (req, res) => {
  const { roomCode } = req.body;

  if (!roomCode || !roomCode.trim()) {
    throw new AppError("roomCode is required", 400);
  }

  const room = await Room.findOne({ code: roomCode.toUpperCase() });

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  const userId = new mongoose.Types.ObjectId(req.user.id);
  const alreadyInRoom = room.users.some((id) => id.toString() === req.user.id);

  if (!alreadyInRoom) {
    room.users.push(userId);
    await room.save();
  }

  res.json({
    success: true,
    room: {
      id: room._id.toString(),
      name: room.name,
      code: room.code,
      users: room.users.map((id) => id.toString())
    }
  });
});

const getRooms = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const rooms = await Room.find({ users: userId })
    .select("_id name code users createdAt")
    .sort({ updatedAt: -1 })
    .lean();

  res.json({
    success: true,
    rooms: rooms.map((room) => ({
      id: room._id.toString(),
      name: room.name,
      code: room.code,
      memberCount: room.users.length,
      createdAt: room.createdAt
    }))
  });
});

const getRoomMembers = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw new AppError("Invalid roomId", 400);
  }

  const room = await Room.findById(roomId).populate("users", "username createdAt");

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  const isUserInRoom = room.users.some((user) => user._id.toString() === req.user.id);

  if (!isUserInRoom) {
    throw new AppError("You are not a member of this room", 403);
  }

  res.json({
    success: true,
    room: {
      id: room._id.toString(),
      name: room.name,
      code: room.code
    },
    members: room.users.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      joinedAt: user.createdAt
    }))
  });
});

module.exports = {
  createRoom,
  joinRoom,
  getRooms,
  getRoomMembers
};
