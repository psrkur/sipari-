import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://yemek5-backend.onrender.com';

export interface SocketEvents {
  newOrder: (data: {
    orderId: number;
    orderNumber: string;
    branchId: number;
    status: string;
    totalAmount: number;
    createdAt: string;
  }) => void;
  
  orderStatusChanged: (data: {
    orderId: number;
    orderNumber: string;
    status: string;
    statusText: string;
    branchId: number;
    updatedAt: string;
  }) => void;
  
  newChatMessage: (data: {
    customerId: number;
    customerName: string;
    message: string;
    response: string;
    timestamp: string;
    platform: string;
  }) => void;
  
  userJoined: (data: { userId: number; name: string }) => void;
  userLeft: (data: { userId: number; name: string }) => void;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Socket bağlantısını oluştur
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 20000,
      forceNew: true,
    });

    const socket = socketRef.current;

    // Bağlantı olayları
    socket.on('connect', () => {
      console.log('🔌 Socket.IO bağlantısı kuruldu');
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO bağlantısı kesildi');
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO bağlantı hatası:', error);
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const joinRoom = (room: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinRoom', room);
      console.log(`👥 Odaya katılındı: ${room}`);
    }
  };

  const leaveRoom = (room: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', room);
      console.log(`👋 Odadan ayrılındı: ${room}`);
    }
  };

  const on = <K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback as any);
    }
  };

  const off = <K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback as any);
    }
  };

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    on,
    off,
  };
}; 