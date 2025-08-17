import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket.IO URL'sini belirle
const getSocketUrl = (): string => {
  // Development ortamında local backend kullan
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
  }
  
  // Production'da canlı backend kullan
  // Eğer window.location.hostname arsut.net.tr ise, production backend kullan
  if (typeof window !== 'undefined' && window.location.hostname === 'arsut.net.tr') {
    return 'https://yemek5-backend.onrender.com';
  }
  
  // Diğer production ortamları için
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'https://yemek5-backend.onrender.com';
};

const SOCKET_URL = getSocketUrl();

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
  dashboardUpdate: (data: {
    timestamp: string;
    message: string;
  }) => void;
}

export const useSocket = () => {
  // Client-side kontrolü ekle
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Sadece client-side'da socket bağlantısını kur
    if (!isClient) return;
    
    // Socket bağlantısını oluştur
    try {
      socketRef.current = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        autoConnect: true,
        timeout: 60000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const socket = socketRef.current;

      // Bağlantı olayları
      socket.on('connect', () => {
        console.log('🔌 Socket.IO bağlantısı kuruldu');
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log(`❌ Socket.IO bağlantısı kesildi, Sebep: ${reason}`);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('🔌 Socket.IO bağlantı hatası:', error.message);
        setIsConnected(false);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Socket.IO bağlantısı yeniden kuruldu, Deneme: ${attemptNumber}`);
        setIsConnected(true);
      });

    } catch (error) {
      console.error('Socket.IO başlatılamadı:', error);
      setIsConnected(false);
    }

    // Cleanup
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch (error) {
          console.error('Socket disconnect hatası:', error);
        }
      }
      setIsConnected(false);
    };
  }, [isClient]);

  const joinRoom = useCallback((room: string) => {
    if (socketRef.current && socketRef.current.connected) {
      try {
        socketRef.current.emit('joinRoom', room);
        console.log(`👥 Odaya katılındı: ${room}`);
      } catch (error) {
        console.error('Odaya katılınamadı:', error);
      }
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current && socketRef.current.connected) {
      try {
        socketRef.current.emit('leaveRoom', room);
        console.log(`👋 Odadan ayrılındı: ${room}`);
      } catch (error) {
        console.error('Odadan ayrılınamadı:', error);
      }
    }
  }, []);

  const on = useCallback(<K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ) => {
    if (socketRef.current) {
      try {
        socketRef.current.on(event, callback as any);
      } catch (error) {
        console.error('Socket event listener eklenemedi:', error);
      }
    }
  }, []);

  const off = useCallback(<K extends keyof SocketEvents>(
    event: K,
    callback: SocketEvents[K]
  ) => {
    if (socketRef.current) {
      try {
        socketRef.current.off(event, callback as any);
      } catch (error) {
        console.error('Socket event listener kaldırılamadı:', error);
      }
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current && socketRef.current.connected) {
      try {
        socketRef.current.emit(event, data);
      } catch (error) {
        console.error('Socket emit hatası:', error);
      }
    }
  }, []);

  return {
    socket: isClient ? socketRef.current : null,
    joinRoom: isClient ? joinRoom : () => {},
    leaveRoom: isClient ? leaveRoom : () => {},
    on: isClient ? on : () => {},
    off: isClient ? off : () => {},
    emit: isClient ? emit : () => {},
    isConnected: isClient && isConnected,
    isClient,
  };
}; 