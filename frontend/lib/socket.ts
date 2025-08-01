import { useEffect, useRef } from 'react';
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
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Socket bağlantısını oluştur
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 30000, // 30 saniye timeout
      forceNew: false, // Mevcut bağlantıyı yeniden kullan
      // Reconnection ayarları
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Buffer ayarları
      maxHttpBufferSize: 1e6, // 1MB
    });

    const socket = socketRef.current;

    // Bağlantı olayları
    socket.on('connect', () => {
      console.log('🔌 Socket.IO bağlantısı kuruldu');
      reconnectAttemptsRef.current = 0; // Bağlantı başarılı olduğunda sıfırla
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket.IO bağlantısı kesildi, Sebep: ${reason}`);
      
      // Yeniden bağlanma denemesi
      if (reason === 'io server disconnect' || reason === 'transport close') {
        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          console.log(`🔄 Yeniden bağlanma denemesi ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        } else {
          console.log(`❌ Maksimum yeniden bağlanma denemesi aşıldı`);
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO bağlantı hatası:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket.IO bağlantısı yeniden kuruldu, Deneme: ${attemptNumber}`);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ Socket.IO yeniden bağlanma hatası:', error.message);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket.IO yeniden bağlanma denemesi: ${attemptNumber}`);
    });

    socket.on('reconnect_failed', () => {
      console.log('❌ Socket.IO yeniden bağlanma başarısız');
    });

    // Ping/Pong kontrolü
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const joinRoom = (room: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('joinRoom', room);
      console.log(`👥 Odaya katılındı: ${room}`);
    } else {
      console.warn('⚠️ Socket bağlantısı yok, odaya katılınamıyor');
    }
  };

  const leaveRoom = (room: string) => {
    if (socketRef.current && socketRef.current.connected) {
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
    isConnected: socketRef.current?.connected || false,
  };
}; 