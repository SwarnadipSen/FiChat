const mongoose = require("mongoose");
const Message = require("../models/Message");
const Room = require("../models/Room");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const getMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    throw new AppError("Invalid roomId", 400);
  }

  const room = await Room.findById(roomId).select("users");

  if (!room) {
    throw new AppError("Room not found", 404);
  }

  const isUserInRoom = room.users.some((id) => id.toString() === req.user.id);

  if (!isUserInRoom) {
    throw new AppError("You are not a member of this room", 403);
  }

  const skip = (page - 1) * limit;

  const messages = await Message.aggregate([
    { $match: { roomId: new mongoose.Types.ObjectId(roomId) } },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "senderId",
        foreignField: "_id",
        as: "sender"
      }
    },
    { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        roomId: 1,
        senderId: 1,
        senderUsername: { $ifNull: ["$sender.username", "Unknown"] },
        text: 1,
        createdAt: 1
      }
    }
  ]);

  res.json({
    success: true,
    messages: messages.map((message) => ({
      id: message._id.toString(),
      roomId: message.roomId.toString(),
      senderId: message.senderId?.toString() || null,
      senderUsername: message.senderUsername,
      text: message.text,
      createdAt: message.createdAt
    })),
    pagination: {
      page,
      limit,
      hasMore: messages.length === limit
    }
  });
});

module.exports = {
  getMessages
};
