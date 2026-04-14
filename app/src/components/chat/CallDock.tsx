'use client';

import { useEffect, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials, getRandomAvatarUrl } from '@/lib/avatar';
import { useAuthStore } from '@/store/authStore';
import { useCallStore } from '@/store/callStore';
import { ChevronDown, ChevronUp, GripHorizontal, Phone, PhoneOff } from 'lucide-react';

type CallParticipant = {
  id: string;
  username: string;
  isSelf: boolean;
  isOnline: boolean;
};

export default function CallDock() {
  const { user } = useAuthStore();
  const {
    activeRoomId,
    callStartedAt,
    callParticipantIds,
    isPanelOpen,
    dockPosition,
    roomMembersByRoom,
    onlineUserIdsByRoom,
    setPanelOpen,
    setDockPosition,
    leaveCall,
    endCall,
    toggleMemberInCall,
    startOrJoinCall,
  } = useCallStore();

  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const [isMobile, setIsMobile] = useState(false);

  const isCallActive = !!activeRoomId && !!callStartedAt;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobile(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!isCallActive || !callStartedAt) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isCallActive, callStartedAt]);

  const elapsedMs = isCallActive && callStartedAt ? Math.max(0, nowTimestamp - callStartedAt) : 0;

  const elapsedLabel = useMemo(() => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
    }

    return [minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
  }, [elapsedMs]);

  const members = useMemo(
    () => (activeRoomId ? roomMembersByRoom[activeRoomId] || [] : []),
    [activeRoomId, roomMembersByRoom]
  );
  const onlineUserIds = useMemo(
    () => (activeRoomId ? onlineUserIdsByRoom[activeRoomId] || [] : []),
    [activeRoomId, onlineUserIdsByRoom]
  );

  const participants = useMemo<CallParticipant[]>(() => {
    const byId = new Map(members.map((member) => [member.id, member]));

    return callParticipantIds
      .map((participantId) => {
        const member = byId.get(participantId);
        if (!member) {
          return null;
        }

        return {
          id: member.id,
          username: member.username,
          isSelf: member.id === user?.id,
          isOnline: onlineUserIds.includes(member.id) || member.id === user?.id,
        };
      })
      .filter((participant): participant is CallParticipant => participant !== null);
  }, [callParticipantIds, members, onlineUserIds, user?.id]);

  const otherMembers = useMemo(
    () => members.filter((member) => member.id !== user?.id),
    [members, user?.id]
  );

  const isInCall = !!user?.id && callParticipantIds.includes(user.id);

  if (!isCallActive || !activeRoomId) {
    return null;
  }

  const dockBody = (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2 call-dock-drag-handle cursor-grab active:cursor-grabbing">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Voice Call</p>
          <p className="truncate text-sm font-medium text-zinc-100">
            Room {activeRoomId.slice(0, 6)} • {participants.length} connected • {elapsedLabel}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <GripHorizontal className="size-4 text-zinc-500" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => setPanelOpen(!isPanelOpen)}
          >
            {isPanelOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
        </div>
      </div>

      {isPanelOpen && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2 text-center"
              >
                <div className="mx-auto mb-1 w-fit">
                  <Avatar size="sm">
                    <AvatarImage
                      src={getRandomAvatarUrl(participant.id)}
                      alt={participant.username}
                    />
                    <AvatarFallback>{getInitials(participant.username)}</AvatarFallback>
                  </Avatar>
                </div>
                <p className="truncate text-xs font-medium text-zinc-200">
                  {participant.isSelf ? `${participant.username} (You)` : participant.username}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {participant.isOnline ? 'Connected' : 'Offline'}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-zinc-800/80 p-2">
            <p className="mb-2 text-xs text-zinc-400">Dummy controls</p>
            <div className="flex flex-wrap gap-2">
              {otherMembers.slice(0, 6).map((member) => {
                const memberInCall = callParticipantIds.includes(member.id);

                return (
                  <Button
                    key={member.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-700"
                    onClick={() => toggleMemberInCall(member.id)}
                  >
                    {memberInCall ? `Remove ${member.username}` : `Add ${member.username}`}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {isInCall ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => leaveCall(user?.id ?? null)}>
                <PhoneOff className="mr-2 size-4" />
                Leave
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => startOrJoinCall(activeRoomId, user)}>
                <Phone className="mr-2 size-4" />
                Join
              </Button>
            )}
            <Button type="button" size="sm" variant="destructive" onClick={endCall}>
              End Call
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="pointer-events-none fixed inset-x-2 bottom-2 z-50">
        <div className="pointer-events-auto">{dockBody}</div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <Rnd
        bounds="window"
        enableResizing={false}
        dragHandleClassName="call-dock-drag-handle"
        position={dockPosition}
        onDragStop={(_event, data) => {
          setDockPosition({ x: data.x, y: data.y });
        }}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="w-[min(380px,calc(100vw-2rem))]">{dockBody}</div>
      </Rnd>
    </div>
  );
}
