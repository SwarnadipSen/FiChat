"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Check,
  Plus,
  Search,
  LogOut,
  Hash,
  Copy,
  ChevronUp,
  UserCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { roomAPI } from "@/lib/apiService";
import { Message } from "@/lib/types";
import { toast } from "sonner";
import CreateRoomDialog from "./CreateRoomDialog";
import JoinRoomDialog from "./JoinRoomDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getRandomAvatarUrl } from "@/lib/avatar";
import { useSocket } from "@/providers/SocketProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatSidebarProps = {
  onClose?: () => void;
  onRoomSelect?: () => void;
};

export default function ChatSidebar({
  onClose,
  onRoomSelect,
}: ChatSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const {
    rooms,
    setRooms,
    activeRoomId,
    setActiveRoom,
    addMessage,
    unreadCounts,
    lastMessageByRoom,
  } = useChatStore();
  const { socket, isConnected } = useSocket();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const joinedRoomIdsRef = useRef(new Set<string>());

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    const element = sidebarRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      setIsCompact(entry.contentRect.width < 320);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Extract roomId from pathname
    const match = pathname?.match(/\/chat\/([^\/]+)/);
    if (match) {
      setActiveRoom(match[1]);
    } else {
      setActiveRoom(null);
    }
  }, [pathname, setActiveRoom]);

  useEffect(() => {
    if (!socket || rooms.length === 0) {
      return;
    }

    rooms.forEach((room) => {
      if (!joinedRoomIdsRef.current.has(room.id)) {
        socket.emit("join_room", { roomId: room.id });
        joinedRoomIdsRef.current.add(room.id);
      }
    });

    const handleReceiveMessage = (message: Message) => {
      addMessage(message.roomId, message);
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, rooms, addMessage]);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const data = await roomAPI.getRooms();
      setRooms(data.rooms);
    } catch (error: any) {
      toast.error("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleRoomClick = (roomId: string) => {
    onRoomSelect?.();
    router.push(`/chat/${roomId}`);
  };

  const handleCopyRoomCode = async (roomCode: string, roomId: string) => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoomId(roomId);
      window.setTimeout(
        () =>
          setCopiedRoomId((current) => (current === roomId ? null : current)),
        1200,
      );
    } catch {
      toast.error("Failed to copy room code");
    }
  };

  return (
    <div
      ref={sidebarRef}
      className="h-full w-full bg-[#121212] border-r border-zinc-800 flex flex-col min-w-0"
    >
      {/* Header */}
      <div className={`${isCompact ? "p-2" : "p-4"} border-b border-zinc-800`}>
        <div
          className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 ${isCompact ? "p-2 space-y-2" : "p-3 space-y-3"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1
                className={`${isCompact ? "text-2xl" : "text-4xl"} font-bold tracking-tight text-zinc-50 leading-none`}
              >
                Chats
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="icon"
                className={`${isCompact ? "h-9 w-9" : "h-10 w-10"} rounded-xl bg-zinc-800 text-zinc-100 hover:bg-zinc-700`}
                aria-label="Create room"
              >
                <Plus className={`${isCompact ? "h-4 w-4" : "h-5 w-5"}`} />
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
            className={`w-full rounded-xl border border-zinc-700 bg-zinc-800/70 text-zinc-300 shadow-none hover:bg-zinc-800 hover:text-zinc-100 ${isCompact ? "justify-center px-2" : "justify-start px-3"}`}
            variant="ghost"
            title="Join room by code"
            aria-label="Join room by code"
          >
            <Search
              className={`${isCompact ? "mr-0 h-4 w-4" : "mr-2 h-4 w-4"}`}
            />
            {!isCompact && "Join room by code"}
          </Button>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Room List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className={`h-full ${isCompact ? "px-1.5" : "px-2"}`}>
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
                <div
                  key={room.id}
                  title={room.name}
                  className={`group relative w-full flex items-start ${isCompact ? "gap-2 px-2 py-2" : "gap-3 px-3 py-2.5"} rounded-xl transition-colors border-l-[3px] ${
                    activeRoomId === room.id
                      ? "border-emerald-500 bg-slate-800/90 text-zinc-50 shadow-[inset_0_0_0_1px_rgba(71,85,105,0.5)]"
                      : "border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleRoomClick(room.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                    title={room.name}
                    aria-label={`Open room ${room.name}`}
                  >
                    <div className="shrink-0">
                      <div
                        className={`${isCompact ? "w-8 h-8" : "w-10 h-10"} rounded-lg bg-zinc-800 flex items-center justify-center`}
                      >
                        <Hash
                          className={`${isCompact ? "h-4 w-4" : "h-5 w-5"} text-zinc-400`}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`${isCompact ? "text-xs" : "text-sm"} leading-snug ${isCompact ? "truncate" : "whitespace-normal wrap-break-word"} ${
                          activeRoomId === room.id
                            ? "font-semibold"
                            : "font-medium"
                        }`}
                      >
                        {room.name}
                      </div>
                      {!isCompact && (
                        <div className="mt-1 truncate text-[11px] text-zinc-500">
                          {lastMessageByRoom[room.id]?.text
                            ? `${lastMessageByRoom[room.id]?.senderUsername}: ${lastMessageByRoom[room.id]?.text}`
                            : `Code: ${room.code}`}
                        </div>
                      )}
                    </div>
                  </button>
                  {!isCompact && room.memberCount && (
                    <div className="text-xs text-zinc-500 pt-1 shrink-0">
                      {room.memberCount}{" "}
                      {room.memberCount === 1 ? "member" : "members"}
                    </div>
                  )}

                  {!!unreadCounts[room.id] && unreadCounts[room.id] > 0 && (
                    <div
                      className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-[11px] font-semibold text-emerald-300"
                      aria-label={`${unreadCounts[room.id]} unread messages`}
                    >
                      {unreadCounts[room.id] > 99
                        ? "99+"
                        : unreadCounts[room.id]}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyRoomCode(room.code, room.id)}
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/70 text-zinc-300 transition-all hover:bg-zinc-700 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                    aria-label={`Copy code for ${room.name}`}
                    title={
                      copiedRoomId === room.id ? "Copied" : `Copy ${room.code}`
                    }
                  >
                    {copiedRoomId === room.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Account Menu */}
      <div className="p-3">
        <div className="mb-2 px-1 text-[11px] text-zinc-500" aria-live="polite">
          {isConnected ? "Realtime connected" : "Realtime reconnecting..."}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-auto p-2.5 justify-between hover:bg-zinc-800 text-zinc-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar size="sm">
                  <AvatarImage
                    src={getRandomAvatarUrl(
                      user?.id || user?.username || "guest",
                    )}
                    alt={user?.username || "User"}
                  />
                  <AvatarFallback>
                    {getInitials(user?.username || "Guest")}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">
                    {user?.username || "Guest"}
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
            <DropdownMenuLabel className="text-zinc-400">
              Account
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                toast.info(`Signed in as ${user?.username || "Guest"}`)
              }
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
