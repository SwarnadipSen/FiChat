'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Socket } from 'socket.io-client';
import { initSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [, setSocketEventTick] = useState(0);
  const { token, isAuthenticated } = useAuthStore();

  const socket = useMemo(() => {
    if (!isAuthenticated || !token) {
      return null;
    }

    return initSocket(token);
  }, [isAuthenticated, token]);

  const isConnected = Boolean(socket?.connected);

  useEffect(() => {
    if (!socket) {
      disconnectSocket();
      return;
    }

    const handleConnect = () => {
      console.log('Socket connected');
      setSocketEventTick((tick) => tick + 1);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setSocketEventTick((tick) => tick + 1);
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setSocketEventTick((tick) => tick + 1);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      disconnectSocket();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
