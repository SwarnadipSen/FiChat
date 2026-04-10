# Chat Server API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [REST API Endpoints](#rest-api-endpoints)
  - [Authentication](#auth-endpoints)
  - [Rooms](#room-endpoints)
  - [Messages](#message-endpoints)
- [WebSocket Events](#websocket-events)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting & Security](#rate-limiting--security)

---

## Overview

The Chat Server provides a real-time messaging platform built with:
- **Express.js** for REST API endpoints
- **Socket.IO** for real-time WebSocket communication
- **MongoDB** for data persistence
- **JWT** for authentication

**Base URL**: `http://localhost:5000` (configurable via `PORT` environment variable)

**CORS**: Configured to accept requests from frontend origin specified in `FRONTEND_ORIGIN` environment variable.

---

## Authentication

All protected endpoints and WebSocket connections require a JWT token.

### Obtaining a Token

Use the `/api/auth/login` endpoint to obtain a JWT token.

### Using the Token

**REST API**: Include the token in the `Authorization` header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**WebSocket**: Pass the token in the connection handshake:
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

**Token Expiry**: Tokens are valid for 7 days from issuance.

---

## REST API Endpoints

### Auth Endpoints

#### Login

Authenticate a user and receive a JWT token.

**Endpoint**: `POST /api/auth/login`

**Authentication**: Not required

**Request Body**:
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing username or password
- `401 Unauthorized`: Invalid credentials

**Example**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john_doe", "password": "securePassword123"}'
```

---

### Room Endpoints

#### Create Room

Create a new chat room with an auto-generated 6-character code.

**Endpoint**: `POST /api/rooms`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "General Discussion"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "room": {
    "id": "507f1f77bcf86cd799439011",
    "name": "General Discussion",
    "code": "ABC123",
    "users": ["507f1f77bcf86cd799439012"]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing or invalid room name
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Failed to generate unique room code

**Example**:
```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "General Discussion"}'
```

---

#### Join Room

Join an existing room using its 6-character code.

**Endpoint**: `POST /api/rooms/join`

**Authentication**: Required

**Request Body**:
```json
{
  "roomCode": "ABC123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "room": {
    "id": "507f1f77bcf86cd799439011",
    "name": "General Discussion",
    "code": "ABC123",
    "users": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing room code
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Room with specified code does not exist

**Notes**:
- Room codes are case-insensitive
- If user is already a member, returns existing room data
- User is automatically added to room's user list

**Example**:
```bash
curl -X POST http://localhost:5000/api/rooms/join \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roomCode": "ABC123"}'
```

---

#### List Rooms

Get all rooms the authenticated user is a member of.

**Endpoint**: `GET /api/rooms`

**Authentication**: Required

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "success": true,
  "rooms": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "General Discussion",
      "code": "ABC123",
      "memberCount": 5,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Dev Team",
      "code": "DEV456",
      "memberCount": 3,
      "createdAt": "2024-01-16T14:20:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

**Notes**:
- Rooms are sorted by most recently updated first
- Returns empty array if user is not a member of any rooms

**Example**:
```bash
curl -X GET http://localhost:5000/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### Get Room Members

Get all members of a specific room.

**Endpoint**: `GET /api/rooms/:roomId/users`

**Authentication**: Required

**Path Parameters**:
- `roomId` (string, required): MongoDB ObjectId of the room

**Response** (200 OK):
```json
{
  "success": true,
  "room": {
    "id": "507f1f77bcf86cd799439011",
    "name": "General Discussion",
    "code": "ABC123"
  },
  "members": [
    {
      "id": "507f1f77bcf86cd799439012",
      "username": "john_doe",
      "joinedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "username": "jane_smith",
      "joinedAt": "2024-01-15T11:45:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid roomId format
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User is not a member of this room
- `404 Not Found`: Room does not exist

**Example**:
```bash
curl -X GET http://localhost:5000/api/rooms/507f1f77bcf86cd799439011/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Message Endpoints

#### Get Messages

Retrieve messages from a specific room with pagination.

**Endpoint**: `GET /api/messages/:roomId`

**Authentication**: Required

**Path Parameters**:
- `roomId` (string, required): MongoDB ObjectId of the room

**Query Parameters**:
- `page` (number, optional): Page number (default: 1, min: 1)
- `limit` (number, optional): Messages per page (default: 50, min: 1, max: 100)

**Response** (200 OK):
```json
{
  "success": true,
  "messages": [
    {
      "id": "507f1f77bcf86cd799439014",
      "roomId": "507f1f77bcf86cd799439011",
      "senderId": "507f1f77bcf86cd799439012",
      "senderUsername": "john_doe",
      "text": "Hello everyone!",
      "createdAt": "2024-01-15T12:00:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439015",
      "roomId": "507f1f77bcf86cd799439011",
      "senderId": "507f1f77bcf86cd799439013",
      "senderUsername": "jane_smith",
      "text": "Hi John!",
      "createdAt": "2024-01-15T12:01:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "hasMore": false
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid roomId format
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User is not a member of this room
- `404 Not Found`: Room does not exist

**Notes**:
- Messages are sorted by most recent first (descending `createdAt`)
- `hasMore` indicates if there are more messages available on the next page
- Uses MongoDB aggregation for optimal performance (single query)

**Examples**:

Get first 50 messages:
```bash
curl -X GET http://localhost:5000/api/messages/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Get second page with 20 messages per page:
```bash
curl -X GET "http://localhost:5000/api/messages/507f1f77bcf86cd799439011?page=2&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## WebSocket Events

### Connection

Connect to the WebSocket server with JWT authentication.

**URL**: `ws://localhost:5000` or `http://localhost:5000` (Socket.IO handles protocol upgrade)

**Authentication**: Pass token in handshake

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});
```

**Connection Errors**:
- `"Unauthorized"`: Missing or invalid JWT token

---

### Events from Client to Server

#### join_room

Join a room to start receiving real-time messages.

**Event Name**: `join_room`

**Payload**:
```javascript
{
  roomId: "507f1f77bcf86cd799439011"  // MongoDB ObjectId string
}
```

**Response Events**:
- **Success**: Broadcasts `user_joined` to all users in the room
- **Error**: Emits `socket_error` to sender only

**Example**:
```javascript
socket.emit('join_room', {
  roomId: '507f1f77bcf86cd799439011'
});
```

**Error Codes**:
- `INVALID_ROOM_ID`: Missing or malformed roomId
- `ROOM_NOT_FOUND`: Room does not exist
- `UNAUTHORIZED`: User is not a member of this room
- `INTERNAL_ERROR`: Server error

---

#### send_message

Send a message to a room.

**Event Name**: `send_message`

**Payload**:
```javascript
{
  roomId: "507f1f77bcf86cd799439011",  // MongoDB ObjectId string
  text: "Hello everyone!"              // String (1-5000 characters)
}
```

**Response Events**:
- **Success**: Broadcasts `receive_message` to all users in the room (including sender)
- **Error**: Emits `socket_error` to sender only

**Example**:
```javascript
socket.emit('send_message', {
  roomId: '507f1f77bcf86cd799439011',
  text: 'Hello everyone!'
});
```

**Validation**:
- Text is trimmed automatically
- Text must be 1-5000 characters after trimming
- User must be a member of the room

**Error Codes**:
- `INVALID_ROOM_ID`: Missing or malformed roomId
- `INVALID_MESSAGE`: Missing or empty text
- `MESSAGE_TOO_LONG`: Text exceeds 5000 characters
- `ROOM_NOT_FOUND`: Room does not exist
- `UNAUTHORIZED`: User is not a member of this room
- `INTERNAL_ERROR`: Server error

---

### Events from Server to Client

#### user_joined

Broadcasted when a user joins a room.

**Event Name**: `user_joined`

**Payload**:
```javascript
{
  roomId: "507f1f77bcf86cd799439011",
  userId: "507f1f77bcf86cd799439012",
  username: "john_doe",
  joinedAt: "2024-01-15T12:00:00.000Z"
}
```

**Trigger**: Emitted when any user successfully executes `join_room` event

**Example**:
```javascript
socket.on('user_joined', (data) => {
  console.log(`${data.username} joined the room`);
});
```

---

#### receive_message

Broadcasted when a message is sent to a room.

**Event Name**: `receive_message`

**Payload**:
```javascript
{
  id: "507f1f77bcf86cd799439014",
  roomId: "507f1f77bcf86cd799439011",
  senderId: "507f1f77bcf86cd799439012",
  senderUsername: "john_doe",
  text: "Hello everyone!",
  timestamp: "2024-01-15T12:00:00.000Z"
}
```

**Trigger**: Emitted when any user successfully sends a message via `send_message` event

**Example**:
```javascript
socket.on('receive_message', (message) => {
  console.log(`${message.senderUsername}: ${message.text}`);
});
```

---

#### socket_error

Emitted when a Socket.IO event fails validation or encounters an error.

**Event Name**: `socket_error`

**Payload**:
```javascript
{
  code: "INVALID_ROOM_ID",           // Error code (see below)
  message: "Invalid roomId"          // Human-readable error message
}
```

**Error Codes**:
| Code | Description |
|------|-------------|
| `INVALID_ROOM_ID` | Missing or malformed roomId |
| `ROOM_NOT_FOUND` | Room does not exist |
| `UNAUTHORIZED` | User not authorized for this action |
| `INVALID_MESSAGE` | Missing or empty message text |
| `MESSAGE_TOO_LONG` | Message exceeds character limit |
| `INTERNAL_ERROR` | Server-side error occurred |

**Example**:
```javascript
socket.on('socket_error', (error) => {
  console.error(`Error [${error.code}]: ${error.message}`);
});
```

---

#### disconnect

Client-side event triggered when connection is lost.

**Event Name**: `disconnect`

**Payload**: 
```javascript
reason  // String indicating disconnection reason
```

**Example**:
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

**Common Reasons**:
- `"io server disconnect"`: Server forcibly closed connection
- `"io client disconnect"`: Client called `socket.disconnect()`
- `"ping timeout"`: Server didn't receive ping in time
- `"transport close"`: Underlying connection closed
- `"transport error"`: Transport error occurred

---

## Data Models

### User

MongoDB Collection: `users`

**Schema**:
```javascript
{
  _id: ObjectId,
  username: String,         // Unique, trimmed
  password: String,         // Bcrypt hashed
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `username` (unique)

**Security**:
- Passwords are hashed with bcrypt (cost factor: 10) before storage
- Password field is never returned in API responses (except during login validation)

---

### Room

MongoDB Collection: `rooms`

**Schema**:
```javascript
{
  _id: ObjectId,
  name: String,             // Trimmed
  code: String,             // 6-character unique code (uppercase, alphanumeric)
  users: [ObjectId],        // Array of User IDs
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `code` (unique)

**Notes**:
- Room codes are auto-generated (e.g., "ABC123")
- Codes are case-insensitive but stored in uppercase
- Creator is automatically added to `users` array

---

### Message

MongoDB Collection: `messages`

**Schema**:
```javascript
{
  _id: ObjectId,
  roomId: ObjectId,         // Reference to Room
  senderId: ObjectId,       // Reference to User
  text: String,             // Trimmed, 1-5000 characters
  createdAt: Date
}
```

**Indexes**:
- `roomId` (single field index)
- `{ roomId: 1, createdAt: -1 }` (compound index for efficient pagination)

**Notes**:
- Messages are permanent (no deletion endpoint)
- Text is automatically trimmed of whitespace

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Missing or invalid request parameters |
| `401` | Unauthorized | Missing, expired, or invalid JWT token |
| `403` | Forbidden | Valid token but user lacks permission |
| `404` | Not Found | Resource does not exist |
| `500` | Internal Server Error | Unexpected server error |

### Common Error Scenarios

#### Authentication Errors

**Missing Token**:
```json
{
  "success": false,
  "error": "Authorization token is required"
}
```

**Invalid Token**:
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### Validation Errors

**Missing Required Field**:
```json
{
  "success": false,
  "error": "username and password are required"
}
```

**Invalid ObjectId**:
```json
{
  "success": false,
  "error": "Invalid roomId"
}
```

#### Authorization Errors

**Not Room Member**:
```json
{
  "success": false,
  "error": "You are not a member of this room"
}
```

---

## Rate Limiting & Security

### Current Implementation

**Password Security**:
- ✅ Passwords hashed with bcrypt (cost factor: 10)
- ✅ Passwords never exposed in API responses
- ✅ Timing-safe password comparison

**Authorization**:
- ✅ Room membership verified before message access
- ✅ User must be room member to send messages
- ✅ Socket.IO events validate room membership

**Input Validation**:
- ✅ Message text limited to 5000 characters
- ✅ All user inputs trimmed
- ✅ MongoDB ObjectId validation

**CORS**:
- ✅ Configured to only allow specified frontend origin
- ✅ Credentials allowed for cookie-based sessions

### Recommendations for Production

⚠️ **Not Yet Implemented** (add before production):

1. **Rate Limiting**: Add rate limiting to prevent abuse
   - Recommend: `express-rate-limit` for REST endpoints
   - Recommend: Custom Socket.IO rate limiter for events

2. **Request Size Limits**: Configure body parser limits
   ```javascript
   app.use(express.json({ limit: '10kb' }));
   ```

3. **Helmet.js**: Add security headers
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

4. **Input Sanitization**: Sanitize HTML/script tags from user input
   - Recommend: `DOMPurify` or `xss` package

5. **Token Refresh**: Implement refresh token mechanism for better security

6. **Logging**: Add comprehensive logging with Winston or Bunyan

7. **Environment Variables**: Use secrets management service (AWS Secrets Manager, HashiCorp Vault)

---

## Complete Usage Example

### Full Client Example (JavaScript)

```javascript
const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let token = null;
let socket = null;

// 1. Login
async function login(username, password) {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    username,
    password
  });
  
  token = response.data.token;
  console.log('Logged in:', response.data.user);
  return response.data;
}

// 2. Create a room
async function createRoom(name) {
  const response = await axios.post(
    `${BASE_URL}/api/rooms`,
    { name },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  console.log('Room created:', response.data.room);
  return response.data.room;
}

// 3. List my rooms
async function listRooms() {
  const response = await axios.get(`${BASE_URL}/api/rooms`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log('My rooms:', response.data.rooms);
  return response.data.rooms;
}

// 4. Get messages
async function getMessages(roomId, page = 1, limit = 50) {
  const response = await axios.get(
    `${BASE_URL}/api/messages/${roomId}?page=${page}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  console.log('Messages:', response.data.messages);
  return response.data;
}

// 5. Connect to WebSocket
function connectSocket() {
  socket = io(BASE_URL, {
    auth: { token }
  });

  socket.on('connect', () => {
    console.log('Connected to WebSocket');
  });

  socket.on('user_joined', (data) => {
    console.log(`${data.username} joined room ${data.roomId}`);
  });

  socket.on('receive_message', (message) => {
    console.log(`[${message.senderUsername}]: ${message.text}`);
  });

  socket.on('socket_error', (error) => {
    console.error(`Socket Error [${error.code}]: ${error.message}`);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
  });
}

// 6. Join room via WebSocket
function joinRoom(roomId) {
  socket.emit('join_room', { roomId });
}

// 7. Send message
function sendMessage(roomId, text) {
  socket.emit('send_message', { roomId, text });
}

// 8. Full workflow
async function main() {
  try {
    // Login
    await login('john_doe', 'securePassword123');
    
    // Create room
    const room = await createRoom('My Test Room');
    
    // Get messages
    await getMessages(room.id);
    
    // Connect WebSocket
    connectSocket();
    
    // Join room
    setTimeout(() => {
      joinRoom(room.id);
      
      // Send message after joining
      setTimeout(() => {
        sendMessage(room.id, 'Hello from the API!');
      }, 1000);
    }, 1000);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

main();
```

---

## Environment Variables

Required environment variables for server configuration:

```bash
# Server Configuration
PORT=5000                                    # Server port

# Database
MONGODB_URI=mongodb://localhost:27017        # MongoDB connection string
MONGODB_DB_NAME=chat_db                      # Database name

# Security
JWT_SECRET=your-super-secret-key-min-32-chars  # JWT signing secret (min 32 chars recommended)

# CORS
FRONTEND_ORIGIN=http://localhost:3000        # Allowed frontend origin
```

---

## Health Check

**Endpoint**: `GET /health`

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "success": true,
  "status": "ok"
}
```

Use this endpoint to verify the server is running.

**Example**:
```bash
curl http://localhost:5000/health
```

---

## Version

**API Version**: 1.0.0  
**Last Updated**: 2024  
**Server Package**: fchat-server

For issues or questions, please contact your development team.
