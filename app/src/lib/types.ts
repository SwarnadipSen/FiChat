export interface User {
  id: string;
  username: string;
}

export interface RoomMember {
  id: string;
  username: string;
  joinedAt: string;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  memberCount?: number;
  users?: string[];
  createdAt?: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  text: string;
  createdAt?: string;
  timestamp?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface RoomsResponse {
  success: boolean;
  rooms: Room[];
}

export interface MessagesResponse {
  success: boolean;
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface CreateRoomResponse {
  success: boolean;
  room: Room;
}

export interface JoinRoomResponse {
  success: boolean;
  room: Room;
}

export interface RoomMembersResponse {
  success: boolean;
  room: Pick<Room, 'id' | 'name' | 'code'>;
  members: RoomMember[];
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface SocketError {
  code: string;
  message: string;
}

export interface UserJoinedEvent {
  roomId: string;
  userId: string;
  username: string;
  joinedAt: string;
}

export interface PresenceUpdateEvent {
  roomId: string;
  onlineUserIds: string[];
}
