  import { create } from 'zustand';
import { Room, Message } from '@/lib/types';

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

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  setActiveRoom: (roomId: string | null) => void;
  
  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  prependMessages: (roomId: string, messages: Message[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},

  setRooms: (rooms) => set({ rooms }),
  
  addRoom: (room) => set((state) => ({
    rooms: [...state.rooms, room],
  })),

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  setMessages: (roomId, messages) => set((state) => ({
    messages: { ...state.messages, [roomId]: dedupeMessagesById(messages) },
  })),

  addMessage: (roomId, message) => set((state) => {
    const currentMessages = state.messages[roomId] || [];
    return {
      messages: {
        ...state.messages,
        [roomId]: dedupeMessagesById([...currentMessages, message]),
      },
    };
  }),

  prependMessages: (roomId, messages) => set((state) => {
    const currentMessages = state.messages[roomId] || [];
    return {
      messages: {
        ...state.messages,
        [roomId]: dedupeMessagesById([...messages, ...currentMessages]),
      },
    };
  }),
}));
