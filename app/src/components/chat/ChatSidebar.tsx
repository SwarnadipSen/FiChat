'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Search, LogOut, Hash, ChevronUp, UserCircle, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { roomAPI } from '@/lib/apiService';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import CreateRoomDialog from './CreateRoomDialog';
import JoinRoomDialog from './JoinRoomDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getRandomAvatarUrl } from '@/lib/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ChatSidebarProps = {
  onClose?: () => void;
  onRoomSelect?: () => void;
};

export default function ChatSidebar({ onClose, onRoomSelect }: ChatSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { rooms, setRooms, activeRoomId, setActiveRoom } = useChatStore();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await roomAPI.getRooms();
      setRooms(data.rooms);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load rooms'));
    } finally {
      setIsLoading(false);
    }
  }, [setRooms]);

  const formatMemberCount = (count: number) =>
    new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 0 }).format(count);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    // Extract roomId from pathname
    const match = pathname?.match(/\/chat\/([^\/]+)/);
    if (match) {
      setActiveRoom(match[1]);
    } else {
      setActiveRoom(null);
    }
  }, [pathname, setActiveRoom]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleRoomClick = (roomId: string) => {
    onRoomSelect?.();
    router.push(`/chat/${roomId}`);
  };

  return (
    <div className="h-full w-full bg-zinc-900 border-r border-zinc-800 flex flex-col min-w-0">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-50 leading-none">Chats</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="icon"
              className="h-10 w-10 rounded-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              aria-label="Create room"
            >
              <Plus className="h-5 w-5" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <Button
          onClick={() => setIsJoinOpen(true)}
          className="w-full justify-start rounded-xl border-0 bg-zinc-800/70 px-3 text-zinc-400 shadow-none hover:bg-zinc-800 hover:text-zinc-100"
          variant="ghost"
        >
          <Search className="mr-2 h-4 w-4" />
          Join room by code
        </Button>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Room List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-2">
          <div className="space-y-1 py-2">
            {isLoading ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                Loading rooms...
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                No rooms yet. Create or join one!
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleRoomClick(room.id)}
                  className={`group w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    activeRoomId === room.id
                      ? 'border-zinc-700 bg-zinc-800/80 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                      : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-800/60 hover:text-zinc-50'
                  }`}
                >
                  <div className="shrink-0">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                        activeRoomId === room.id
                          ? 'bg-zinc-700/80'
                          : 'bg-zinc-800 group-hover:bg-zinc-700/70'
                      }`}
                    >
                      <Hash className="h-5 w-5 text-zinc-400 group-hover:text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate font-medium">{room.name}</div>
                    {/* <div className="text-xs text-zinc-500">{room.code}</div> */}
                  </div>
                  {room.memberCount && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-900/80 px-2 py-1 text-[11px] font-medium text-zinc-300">
                      <Users className="h-3 w-3" />
                      <span>{formatMemberCount(room.memberCount)}</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Account Menu */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-auto p-2.5 justify-between hover:bg-zinc-800 text-zinc-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar size="sm">
                  <AvatarImage
                    src={getRandomAvatarUrl(user?.id || user?.username || 'guest')}
                    alt={user?.username || 'User'}
                  />
                  <AvatarFallback>{getInitials(user?.username || 'Guest')}</AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">
                    {user?.username || 'Guest'}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">My account</p>
                </div>
              </div>
              <ChevronUp className="size-4 text-zinc-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="bg-zinc-900 border border-zinc-800 text-zinc-100"
          >
            <DropdownMenuLabel className="text-zinc-400">Account</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => toast.info(`Signed in as ${user?.username || 'Guest'}`)}
              className="focus:bg-zinc-800 focus:text-zinc-50"
            >
              <UserCircle className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={handleLogout}
              variant="destructive"
              className="focus:bg-red-500/10"
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogs */}
      <CreateRoomDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={loadRooms}
      />
      <JoinRoomDialog
        open={isJoinOpen}
        onOpenChange={setIsJoinOpen}
        onSuccess={loadRooms}
      />
    </div>
  );
}
