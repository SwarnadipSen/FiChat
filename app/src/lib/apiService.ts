import api from './api';
import {
  AuthResponse,
  RoomsResponse,
  MessagesResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomMembersResponse,
} from './types';

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      username,
      password,
    });
    return data;
  },
};

// Room API
export const roomAPI = {
  getRooms: async () => {
    const { data } = await api.get<RoomsResponse>('/rooms');
    return data;
  },

  createRoom: async (name: string) => {
    const { data } = await api.post<CreateRoomResponse>('/rooms', { name });
    return data;
  },

  joinRoom: async (roomCode: string) => {
    const { data } = await api.post<JoinRoomResponse>('/rooms/join', {
      roomCode,
    });
    return data;
  },

  getRoomMembers: async (roomId: string) => {
    const { data } = await api.get<RoomMembersResponse>(`/rooms/${roomId}/users`);
    return data;
  },
};

// Message API
export const messageAPI = {
  getMessages: async (roomId: string, page = 1, limit = 50) => {
    const { data } = await api.get<MessagesResponse>(
      `/messages/${roomId}?page=${page}&limit=${limit}`
    );
    return data;
  },
};
