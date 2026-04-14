import { create } from "zustand";
import { Room, Message } from "@/lib/types";

const dedupeMessagesById = (messages: Message[]): Message[] => {
  const seen = new Set<string>();
  const unique: Message[] = [];

  for (const message of messages) {
    if (seen.has(message.id)) {
      continue;
    }

    seen.add(message.id);
    unique.push(message);
  }

  return unique;
};

const findLastMessage = (messages: Message[]): Message | null => {
  if (messages.length === 0) {
    return null;
  }

  return messages[messages.length - 1];
};

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  lastMessageByRoom: Record<string, Message | null>;

  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  setActiveRoom: (roomId: string | null) => void;

  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  prependMessages: (roomId: string, messages: Message[]) => void;
  markRoomRead: (roomId: string) => void;
  resetUnreadCounts: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  unreadCounts: {},
  lastMessageByRoom: {},

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [...state.rooms, room],
    })),

  setActiveRoom: (roomId) =>
    set((state) => ({
      activeRoomId: roomId,
      unreadCounts: roomId
        ? { ...state.unreadCounts, [roomId]: 0 }
        : state.unreadCounts,
    })),

  setMessages: (roomId, messages) =>
    set((state) => {
      const unique = dedupeMessagesById(messages);
      return {
        messages: { ...state.messages, [roomId]: unique },
        lastMessageByRoom: {
          ...state.lastMessageByRoom,
          [roomId]: findLastMessage(unique),
        },
      };
    }),

  addMessage: (roomId, message) =>
    set((state) => {
      const currentMessages = state.messages[roomId] || [];
      const unique = dedupeMessagesById([...currentMessages, message]);
      const shouldIncrementUnread = state.activeRoomId !== roomId;

      return {
        messages: {
          ...state.messages,
          [roomId]: unique,
        },
        unreadCounts: {
          ...state.unreadCounts,
          [roomId]: shouldIncrementUnread
            ? (state.unreadCounts[roomId] || 0) + 1
            : 0,
        },
        lastMessageByRoom: {
          ...state.lastMessageByRoom,
          [roomId]: unique[unique.length - 1] || null,
        },
      };
    }),

  prependMessages: (roomId, messages) =>
    set((state) => {
      const currentMessages = state.messages[roomId] || [];
      const unique = dedupeMessagesById([...messages, ...currentMessages]);

      return {
        messages: {
          ...state.messages,
          [roomId]: unique,
        },
        lastMessageByRoom: {
          ...state.lastMessageByRoom,
          [roomId]: findLastMessage(unique),
        },
      };
    }),

  markRoomRead: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: 0,
      },
    })),

  resetUnreadCounts: () => set({ unreadCounts: {} }),
}));
