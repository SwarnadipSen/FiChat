const express = require("express");
const { createRoom, joinRoom, getRooms, getRoomMembers } = require("../controllers/roomController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.post("/", authMiddleware, createRoom);
router.post("/join", authMiddleware, joinRoom);
router.get("/", authMiddleware, getRooms);
router.get("/:roomId/users", authMiddleware, getRoomMembers);

module.exports = router;
