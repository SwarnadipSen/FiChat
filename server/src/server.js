const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const connectDatabase = require("./config/db");
const setupSocket = require("./sockets/chatSocket");

async function startServer() {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is missing in environment variables.");
  }

  await connectDatabase();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.frontendOrigin,
      credentials: true
    }
  });

  setupSocket(io);

  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
