"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useSocket } from "@/providers/SocketProvider";
import { messageAPI } from "@/lib/apiService";
import { toast } from "sonner";
import MessageInput from "@/components/chat/MessageInput";
import { Message, PresenceUpdateEvent, RoomMember } from "@/lib/types";
import {
  differenceInMinutes,
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
} from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getRandomAvatarUrl } from "@/lib/avatar";
import { roomAPI } from "@/lib/apiService";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Check, Copy, Phone } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useCallStore } from "@/store/callStore";

function extractCodeText(node: ReactNode): string {
  if (typeof node === "string") {
    return node;
  }

  if (typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractCodeText).join("");
  }

  if (node && typeof node === "object" && "props" in node) {
    return extractCodeText(
      (node as { props?: { children?: ReactNode } }).props?.children ?? "",
    );
  }

  return "";
}

function CopyableCodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const firstChild = Array.isArray(children) ? children[0] : children;
  const codeClassName =
    firstChild && typeof firstChild === "object" && "props" in firstChild
      ? ((firstChild as { props?: { className?: string } }).props?.className ??
        "")
      : "";
  const classTokens = codeClassName.split(" ").map((token) => token.trim());
  const languageToken = classTokens.find((token) =>
    token.startsWith("language-"),
  );
  const language = languageToken
    ? languageToken.replace("language-", "")
    : "code";
  const codeText = extractCodeText(children).replace(/\n$/, "");

  const handleCopy = async () => {
    if (!codeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950/90">
      <div className="group/codebar flex items-center justify-between border-b border-zinc-700/90 bg-zinc-900/80 px-3 py-1.5">
        <span className="text-[11px] font-medium tracking-wide text-zinc-300">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/70 px-2 py-1 text-[11px] font-medium text-zinc-200 transition-all hover:bg-zinc-800 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 md:opacity-0 md:group-hover/codebar:opacity-100 md:group-focus-within/codebar:opacity-100"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="message-codeblock overflow-x-auto p-3">{children}</pre>
    </div>
  );
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;

  const { user } = useAuthStore();
  const {
    rooms,
    messages,
    setMessages,
    addMessage,
    prependMessages,
    markRoomRead,
  } = useChatStore();
  const { socket, isConnected } = useSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isRoomCodeCopied, setIsRoomCodeCopied] = useState(false);
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
  const roomMessages = messages[roomId] || [];
  const isCallActive = callStartedAt !== null;
  const isCurrentRoomCallActive = isCallActive && activeRoomId === roomId;
  const isInCall =
    !!user?.id &&
    isCurrentRoomCallActive &&
    callParticipantIds.includes(user.id);

  useEffect(() => {
    if (roomId) {
      setCurrentPage(1);
      setHasMoreMessages(false);
      shouldStickToBottomRef.current = true;
      markRoomRead(roomId);
      loadMessages();
      loadMembers();
    }
  }, [roomId, markRoomRead]);

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

      const handleUserJoined = (data: any) => {
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

      const handleSocketError = (error: any) => {
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
  }, [socket, roomId, user?.id]);

  useEffect(() => {
    if (shouldStickToBottomRef.current && !isLoadingOlder) {
      scrollToBottom();
    }
  }, [roomMessages]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const data = await messageAPI.getMessages(roomId, 1, 50);
      setMessages(roomId, data.messages.reverse());
      setCurrentPage(1);
      setHasMoreMessages(data.pagination.hasMore);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "Failed to load older messages",
      );
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

  const loadMembers = async () => {
    try {
      const data = await roomAPI.getRoomMembers(roomId);
      setMembers(data.members);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to load room members");
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
      toast.error("Not connected. Reconnect and retry sending.");
    }
  };

  const formatDayLabel = (value: string) => {
    const date = new Date(value);

    if (isToday(date)) {
      return "Today";
    }

    if (isYesterday(date)) {
      return "Yesterday";
    }

    return format(date, "MMM d, yyyy");
  };

  const getMessageTimestamp = (message: Message) => {
    return message.createdAt || message.timestamp || new Date().toISOString();
  };

  const retryConnection = () => {
    if (!socket) {
      return;
    }

    socket.connect();
    toast.info("Reconnecting...");
  };

  const startDummyCall = () => {
    startOrJoinCall(roomId, user);
  };

  const leaveDummyCall = () => {
    leaveCall(user?.id ?? null);
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setIsRoomCodeCopied(true);
      window.setTimeout(() => setIsRoomCodeCopied(false), 1200);
    } catch {
      toast.error("Failed to copy room code");
    }
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
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-zinc-50 sm:text-xl wrap-break-word">
              {room.name}
            </h2>
            <div className="group/roomcode mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
              <span>
                Code:{" "}
                <span className="font-medium text-zinc-300">{room.code}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyRoomCode}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800/70 text-zinc-300 transition-all hover:bg-zinc-700 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 md:opacity-0 md:group-hover/roomcode:opacity-100 md:group-focus-within/roomcode:opacity-100"
                aria-label="Copy room code"
                title={isRoomCodeCopied ? "Copied" : "Copy room code"}
              >
                {isRoomCodeCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isConnected
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {isConnected ? "Connected" : "Reconnecting"}
              </span>
              {!isConnected && (
                <button
                  type="button"
                  onClick={retryConnection}
                  className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
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
            <div className="hidden -space-x-2 sm:flex">
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
        className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin sm:px-6 sm:py-4"
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
            {roomMessages.map((message, index) => {
              const isOwnMessage = message.senderId === user?.id;
              const timestamp = getMessageTimestamp(message);
              const previousMessage =
                index > 0 ? roomMessages[index - 1] : null;
              const previousTimestamp = previousMessage
                ? getMessageTimestamp(previousMessage)
                : null;
              const showDateSeparator =
                !previousTimestamp ||
                format(new Date(previousTimestamp), "yyyy-MM-dd") !==
                  format(new Date(timestamp), "yyyy-MM-dd");
              const isMessageGrouped =
                !!previousMessage &&
                previousMessage.senderId === message.senderId &&
                differenceInMinutes(
                  new Date(timestamp),
                  new Date(previousTimestamp || timestamp),
                ) < 5 &&
                !showDateSeparator;

              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-zinc-800" />
                      <span className="text-[11px] font-medium text-zinc-500">
                        {formatDayLabel(timestamp)}
                      </span>
                      <div className="h-px flex-1 bg-zinc-800" />
                    </div>
                  )}
                  <div
                    className={`flex ${isMessageGrouped ? "gap-2" : "gap-3"} ${isOwnMessage ? "flex-row-reverse" : ""}`}
                  >
                    <div className="shrink-0">
                      {isMessageGrouped ? (
                        <div className="h-10 w-10" aria-hidden="true" />
                      ) : (
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
                      )}
                    </div>
                    <div
                      className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]`}
                    >
                      {!isMessageGrouped && (
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-300">
                            {message.senderUsername}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(timestamp), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
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
                                <p className="whitespace-pre-wrap">
                                  {children}
                                </p>
                              ),
                              pre: ({ children }) => (
                                <CopyableCodeBlock>
                                  {children}
                                </CopyableCodeBlock>
                              ),
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
