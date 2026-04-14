"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useSocket } from "@/providers/SocketProvider";
import { messageAPI } from "@/lib/apiService";
import { toast } from "sonner";
import MessageInput from "@/components/chat/MessageInput";
import {
  Message,
  PresenceUpdateEvent,
  RoomMember,
  SocketError,
  UserJoinedEvent,
} from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getRandomAvatarUrl } from "@/lib/avatar";
import { roomAPI } from "@/lib/apiService";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useCallStore } from "@/store/callStore";
import { getErrorMessage } from "@/lib/errors";
import CopyIconButton from "@/components/ui/copy-icon-button";

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((item) => extractNodeText(item)).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    return extractNodeText(
      (node as { props?: { children?: ReactNode } }).props?.children,
    );
  }

  return "";
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;

  const { user } = useAuthStore();
  const { rooms, messages, setMessages, addMessage, prependMessages } =
    useChatStore();
  const { socket, isConnected } = useSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const {
    activeRoomId,
    callStartedAt,
    callParticipantIds,
    startOrJoinCall,
    leaveCall,
    syncRoomMembers,
    syncOnlineUserIds,
  } = useCallStore();

  const room = rooms.find((r) => r.id === roomId);
  const roomMessages = useMemo(
    () => messages[roomId] || [],
    [messages, roomId],
  );
  const isCallActive = callStartedAt !== null;
  const isCurrentRoomCallActive = isCallActive && activeRoomId === roomId;
  const isInCall =
    !!user?.id &&
    isCurrentRoomCallActive &&
    callParticipantIds.includes(user.id);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await messageAPI.getMessages(roomId, 1, 50);
      setMessages(roomId, data.messages.reverse());
      setCurrentPage(1);
      setHasMoreMessages(data.pagination.hasMore);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load messages"));
    } finally {
      setIsLoading(false);
    }
  }, [roomId, setMessages]);

  const loadMembers = useCallback(async () => {
    try {
      const data = await roomAPI.getRoomMembers(roomId);
      setMembers(data.members);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load room members"));
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId) {
      setCurrentPage(1);
      setHasMoreMessages(false);
      shouldStickToBottomRef.current = true;
      loadMessages();
      loadMembers();
    }
  }, [roomId, loadMessages, loadMembers]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    syncRoomMembers(roomId, members, user);
  }, [roomId, members, user, syncRoomMembers]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    syncOnlineUserIds(roomId, onlineUserIds);
  }, [roomId, onlineUserIds, syncOnlineUserIds]);

  useEffect(() => {
    if (socket && roomId) {
      const handleReceiveMessage = (message: Message) => {
        if (message.roomId === roomId) {
          addMessage(roomId, message);
        }
      };

      const handleUserJoined = (data: UserJoinedEvent) => {
        if (data.roomId === roomId && data.userId !== user?.id) {
          toast.info(`${data.username} joined the room`);

          setMembers((prev) => {
            const alreadyExists = prev.some(
              (member) => member.id === data.userId,
            );
            if (alreadyExists) {
              return prev;
            }

            return [
              ...prev,
              {
                id: data.userId,
                username: data.username,
                joinedAt: data.joinedAt,
              },
            ];
          });
        }
      };

      const handleSocketError = (error: SocketError) => {
        toast.error(error.message);
      };

      const handlePresenceUpdate = (data: PresenceUpdateEvent) => {
        if (data.roomId === roomId) {
          setOnlineUserIds(data.onlineUserIds);
        }
      };

      // Join room via socket
      socket.emit("join_room", { roomId });

      // Listen for new messages
      socket.on("receive_message", handleReceiveMessage);

      // Listen for user joined events
      socket.on("user_joined", handleUserJoined);

      // Listen for socket errors
      socket.on("socket_error", handleSocketError);

      // Listen for online presence updates
      socket.on("presence_update", handlePresenceUpdate);

      return () => {
        socket.off("receive_message", handleReceiveMessage);
        socket.off("user_joined", handleUserJoined);
        socket.off("socket_error", handleSocketError);
        socket.off("presence_update", handlePresenceUpdate);
      };
    }
  }, [socket, roomId, user?.id, addMessage]);

  useEffect(() => {
    if (shouldStickToBottomRef.current && !isLoadingOlder) {
      scrollToBottom();
    }
  }, [roomMessages, isLoadingOlder]);

  const loadOlderMessages = async () => {
    if (isLoadingOlder || !hasMoreMessages) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    setIsLoadingOlder(true);

    const previousScrollHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;

    try {
      const nextPage = currentPage + 1;
      const data = await messageAPI.getMessages(roomId, nextPage, 50);
      const olderMessages = data.messages.reverse();

      prependMessages(roomId, olderMessages);
      setCurrentPage(nextPage);
      setHasMoreMessages(data.pagination.hasMore);

      requestAnimationFrame(() => {
        if (!scrollRef.current) return;

        const newScrollHeight = scrollRef.current.scrollHeight;
        scrollRef.current.scrollTop =
          newScrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load older messages"));
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const nearTop = container.scrollTop <= 64;
    const nearBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight) <=
      120;

    shouldStickToBottomRef.current = nearBottom;

    if (nearTop && hasMoreMessages && !isLoadingOlder) {
      loadOlderMessages();
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = (text: string) => {
    if (socket && isConnected) {
      socket.emit("send_message", { roomId, text });
    } else {
      toast.error("Not connected to server");
    }
  };

  const startDummyCall = () => {
    startOrJoinCall(roomId, user);
  };

  const leaveDummyCall = () => {
    leaveCall(user?.id ?? null);
  };

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Room not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Room Header */}
      <div className="shrink-0 px-6 py-4 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-50">{room.name}</h2>
            <div className="group flex items-center gap-2">
              <p className="text-sm text-zinc-400">Code: {room.code}</p>
              <CopyIconButton
                value={room.code}
                ariaLabel={`Copy room code ${room.code}`}
                className="h-6 w-6 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className={`border-0 text-zinc-100 hover:bg-zinc-700 ${
                      isInCall
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-zinc-800"
                    }`}
                    onClick={isInCall ? leaveDummyCall : startDummyCall}
                  >
                    <Phone className="size-4" />
                    <span className="sr-only">
                      {isInCall
                        ? "Leave voice call"
                        : isCurrentRoomCallActive
                          ? "Join voice call"
                          : "Start voice call"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  {isInCall
                    ? "Leave Call"
                    : isCurrentRoomCallActive
                      ? "Join Call"
                      : "Start Call"}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar
                        size="sm"
                        className="border border-zinc-800 cursor-default"
                      >
                        <AvatarImage
                          src={getRandomAvatarUrl(member.id || member.username)}
                          alt={member.username}
                        />
                        <AvatarFallback>
                          {getInitials(member.username)}
                        </AvatarFallback>
                      </Avatar>
                      {onlineUserIds.includes(member.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    {member.username}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <span className="text-xs text-zinc-400 whitespace-nowrap">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
            {isCurrentRoomCallActive && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-medium text-emerald-300">
                {callParticipantIds.length} in call
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin"
      >
        {isLoadingOlder && (
          <div className="pb-3 text-center text-xs text-zinc-500">
            Loading older messages...
          </div>
        )}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-zinc-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24 bg-zinc-800" />
                  <Skeleton className="h-16 w-full bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : roomMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-zinc-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {roomMessages.map((message) => {
              const isOwnMessage = message.senderId === user?.id;
              const timestamp = message.createdAt || message.timestamp;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <div className="shrink-0">
                    <Avatar size="lg">
                      <AvatarImage
                        src={getRandomAvatarUrl(
                          message.senderId || message.senderUsername,
                        )}
                        alt={message.senderUsername}
                      />
                      <AvatarFallback>
                        {getInitials(message.senderUsername)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div
                    className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[70%]`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-300">
                        {message.senderUsername}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {timestamp &&
                          formatDistanceToNow(new Date(timestamp), {
                            addSuffix: true,
                          })}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwnMessage
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-800 text-zinc-50"
                      }`}
                    >
                      <div
                        className={`message-markdown text-sm wrap-break-word ${
                          isOwnMessage ? "text-white" : "text-zinc-50"
                        }`}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            p: ({ children }) => (
                              <p className="whitespace-pre-wrap">{children}</p>
                            ),
                            pre: ({ children }) => {
                              const codeText = extractNodeText(children).trim();

                              return (
                                <div className="group relative my-2">
                                  <CopyIconButton
                                    value={codeText}
                                    ariaLabel="Copy code block"
                                    className="absolute right-2 top-2 z-10 h-6 w-6 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                                  />
                                  <pre className="message-codeblock overflow-x-auto rounded-lg p-3 pr-11">
                                    {children}
                                  </pre>
                                </div>
                              );
                            },
                            code: ({ className, children, ...props }) => {
                              const isBlockCode = !!className;

                              if (isBlockCode) {
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              }

                              return (
                                <code
                                  className="rounded bg-zinc-900/70 px-1.5 py-0.5 text-zinc-100"
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
}
