const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const env = require("../config/env");
const User = require("../models/User");
const Message = require("../models/Message");
const Room = require("../models/Room");

const roomUserConnectionCounts = new Map();
const socketJoinedRooms = new Map();

function emitPresenceUpdate(io, roomId) {
  const roomCounts = roomUserConnectionCounts.get(roomId) || new Map();
  io.to(roomId).emit("presence_update", {
    roomId,
    onlineUserIds: Array.from(roomCounts.keys())
  });
}

function incrementRoomPresence(roomId, userId) {
  if (!roomUserConnectionCounts.has(roomId)) {
    roomUserConnectionCounts.set(roomId, new Map());
  }

  const roomCounts = roomUserConnectionCounts.get(roomId);
  roomCounts.set(userId, (roomCounts.get(userId) || 0) + 1);
}

function decrementRoomPresence(roomId, userId) {
  const roomCounts = roomUserConnectionCounts.get(roomId);
  if (!roomCounts) return;

  const nextCount = (roomCounts.get(userId) || 0) - 1;

  if (nextCount <= 0) {
    roomCounts.delete(userId);
  } else {
    roomCounts.set(userId, nextCount);
  }

  if (roomCounts.size === 0) {
    roomUserConnectionCounts.delete(roomId);
  }
}

function setupSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.userId).select("_id username");

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = {
        id: user._id.toString(),
        username: user.username
      };

      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.user.id})`);

    socketJoinedRooms.set(socket.id, new Set());

    socket.on("join_room", async (payload = {}) => {
      try {
        const { roomId } = payload;

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          socket.emit("socket_error", { code: "INVALID_ROOM_ID", message: "Invalid roomId" });
          return;
        }

        const room = await Room.findById(roomId).select("_id name users");
        if (!room) {
          socket.emit("socket_error", { code: "ROOM_NOT_FOUND", message: "Room not found" });
          return;
        }

        const isUserInRoom = room.users.some((id) => id.toString() === socket.user.id);
        if (!isUserInRoom) {
          socket.emit("socket_error", { code: "UNAUTHORIZED", message: "You are not a member of this room" });
          return;
        }

        const joinedRooms = socketJoinedRooms.get(socket.id);
        if (joinedRooms?.has(roomId)) {
          emitPresenceUpdate(io, roomId);
          return;
        }

        socket.join(roomId);
        joinedRooms?.add(roomId);
        incrementRoomPresence(roomId, socket.user.id);

        emitPresenceUpdate(io, roomId);

        io.to(roomId).emit("user_joined", {
          roomId,
          userId: socket.user.id,
          username: socket.user.username,
          joinedAt: new Date().toISOString()
        });
      } catch (error) {
        socket.emit("socket_error", { code: "INTERNAL_ERROR", message: "Failed to join room" });
      }
    });

    socket.on("send_message", async (payload = {}) => {
      try {
        const { roomId, text } = payload;

        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          socket.emit("socket_error", { code: "INVALID_ROOM_ID", message: "Invalid roomId" });
          return;
        }

        if (!text || typeof text !== "string" || !text.trim()) {
          socket.emit("socket_error", { code: "INVALID_MESSAGE", message: "Message text is required" });
          return;
        }

        if (text.trim().length > 5000) {
          socket.emit("socket_error", { code: "MESSAGE_TOO_LONG", message: "Message text must not exceed 5000 characters" });
          return;
        }

        const room = await Room.findById(roomId).select("users");
        if (!room) {
          socket.emit("socket_error", { code: "ROOM_NOT_FOUND", message: "Room not found" });
          return;
        }

        const isUserInRoom = room.users.some((id) => id.toString() === socket.user.id);
        if (!isUserInRoom) {
          socket.emit("socket_error", { code: "UNAUTHORIZED", message: "You are not a member of this room" });
          return;
        }

        const message = await Message.create({
          roomId,
          senderId: socket.user.id,
          text: text.trim()
        });

        const outgoing = {
          id: message._id.toString(),
          roomId,
          senderId: socket.user.id,
          senderUsername: socket.user.username,
          text: message.text,
          timestamp: message.createdAt.toISOString()
        };

        io.to(roomId).emit("receive_message", outgoing);
      } catch (error) {
        socket.emit("socket_error", { code: "INTERNAL_ERROR", message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      const joinedRooms = socketJoinedRooms.get(socket.id) || new Set();
      joinedRooms.forEach((joinedRoomId) => {
        decrementRoomPresence(joinedRoomId, socket.user.id);
        emitPresenceUpdate(io, joinedRoomId);
      });

      socketJoinedRooms.delete(socket.id);

      console.log(`User disconnected: ${socket.user.username} (${socket.user.id})`);
    });
  });
}

module.exports = setupSocket;
