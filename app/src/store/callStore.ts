import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RoomMember, User } from '@/lib/types';

type DockPosition = {
  x: number;
  y: number;
};

interface CallState {
  activeRoomId: string | null;
  callStartedAt: number | null;
  callParticipantIds: string[];
  isPanelOpen: boolean;
  dockPosition: DockPosition;
  roomMembersByRoom: Record<string, RoomMember[]>;
  onlineUserIdsByRoom: Record<string, string[]>;

  syncRoomMembers: (roomId: string, members: RoomMember[], currentUser: User | null) => void;
  syncOnlineUserIds: (roomId: string, onlineUserIds: string[]) => void;
  startOrJoinCall: (roomId: string, currentUser: User | null) => void;
  leaveCall: (userId: string | null) => void;
  endCall: () => void;
  toggleMemberInCall: (memberId: string) => void;

  setPanelOpen: (open: boolean) => void;
  setDockPosition: (position: DockPosition) => void;
}

const dedupeMembersById = (members: RoomMember[]): RoomMember[] => {
  const byId = new Map<string, RoomMember>();

  for (const member of members) {
    byId.set(member.id, member);
  }

  return Array.from(byId.values());
};

export const useCallStore = create<CallState>()(
  persist(
    (set, get) => ({
      activeRoomId: null,
      callStartedAt: null,
      callParticipantIds: [],
      isPanelOpen: true,
      dockPosition: { x: 24, y: 24 },
      roomMembersByRoom: {},
      onlineUserIdsByRoom: {},

      syncRoomMembers: (roomId, members, currentUser) => {
        const nextMembers = [...members];

        if (currentUser?.id && !nextMembers.some((member) => member.id === currentUser.id)) {
          nextMembers.push({
            id: currentUser.id,
            username: currentUser.username,
            joinedAt: new Date().toISOString(),
          });
        }

        set((state) => ({
          roomMembersByRoom: {
            ...state.roomMembersByRoom,
            [roomId]: dedupeMembersById(nextMembers),
          },
        }));
      },

      syncOnlineUserIds: (roomId, onlineUserIds) => {
        set((state) => ({
          onlineUserIdsByRoom: {
            ...state.onlineUserIdsByRoom,
            [roomId]: [...new Set(onlineUserIds)],
          },
        }));
      },

      startOrJoinCall: (roomId, currentUser) => {
        if (!currentUser?.id) {
          return;
        }

        const state = get();

        if (state.callStartedAt && state.activeRoomId === roomId) {
          if (state.callParticipantIds.includes(currentUser.id)) {
            set({ isPanelOpen: true });
            return;
          }

          set({
            callParticipantIds: [...state.callParticipantIds, currentUser.id],
            isPanelOpen: true,
          });
          return;
        }

        set({
          activeRoomId: roomId,
          callStartedAt: Date.now(),
          callParticipantIds: [currentUser.id],
          isPanelOpen: true,
        });
      },

      leaveCall: (userId) => {
        if (!userId) {
          return;
        }

        const state = get();
        const nextParticipants = state.callParticipantIds.filter((participantId) => participantId !== userId);

        if (nextParticipants.length === 0) {
          set({
            activeRoomId: null,
            callStartedAt: null,
            callParticipantIds: [],
            isPanelOpen: false,
          });
          return;
        }

        set({ callParticipantIds: nextParticipants });
      },

      endCall: () => {
        set({
          activeRoomId: null,
          callStartedAt: null,
          callParticipantIds: [],
          isPanelOpen: false,
        });
      },

      toggleMemberInCall: (memberId) => {
        const state = get();

        if (!state.callStartedAt || !state.activeRoomId) {
          return;
        }

        if (state.callParticipantIds.includes(memberId)) {
          const nextParticipants = state.callParticipantIds.filter((participantId) => participantId !== memberId);

          if (nextParticipants.length === 0) {
            set({
              activeRoomId: null,
              callStartedAt: null,
              callParticipantIds: [],
              isPanelOpen: false,
            });
            return;
          }

          set({ callParticipantIds: nextParticipants });
          return;
        }

        set({ callParticipantIds: [...state.callParticipantIds, memberId] });
      },

      setPanelOpen: (open) => set({ isPanelOpen: open }),

      setDockPosition: (position) => set({ dockPosition: position }),
    }),
    {
      name: 'call-store',
      partialize: (state) => ({
        activeRoomId: state.activeRoomId,
        callStartedAt: state.callStartedAt,
        callParticipantIds: state.callParticipantIds,
        isPanelOpen: state.isPanelOpen,
        dockPosition: state.dockPosition,
        roomMembersByRoom: state.roomMembersByRoom,
        onlineUserIdsByRoom: state.onlineUserIdsByRoom,
      }),
    }
  )
);
