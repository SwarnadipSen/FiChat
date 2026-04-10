const express = require("express");
const { getMessages } = require("../controllers/messageController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/:roomId", authMiddleware, getMessages);

module.exports = router;
