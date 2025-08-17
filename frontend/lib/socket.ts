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
  dashboardUpdate: (data: {
    timestamp: string;
    message: string;
  }) => void;
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10; // Artırıldı
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Socket bağlantısını oluştur
    socketRef.current = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Polling'i önce dene
      autoConnect: true,
      timeout: 60000, // 60 saniye timeout (artırıldı)
      forceNew: false, // Mevcut bağlantıyı yeniden kullan
      // Reconnection ayarları iyileştirildi
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000, // Artırıldı
    });

    const socket = socketRef.current;

    // Bağlantı olayları
    socket.on('connect', () => {
      console.log('🔌 Socket.IO bağlantısı kuruldu');
      reconnectAttemptsRef.current = 0; // Bağlantı başarılı olduğunda sıfırla
      
      // Reconnect timeout'u temizle
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket.IO bağlantısı kesildi, Sebep: ${reason}`);
      
      // Yeniden bağlanma denemesi
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          console.log(`🔄 Yeniden bağlanma denemesi ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          
          // Manuel yeniden bağlanma denemesi
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (socket && !socket.connected) {
              console.log(`🔄 Manuel yeniden bağlanma denemesi...`);
              socket.connect();
            }
          }, delay);
        } else {
          console.log(`❌ Maksimum yeniden bağlanma denemesi aşıldı`);
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO bağlantı hatası:', error.message);
      
      // Bağlantı hatası durumunda yeniden deneme
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (socket && !socket.connected) {
            console.log(`🔄 Bağlantı hatası sonrası yeniden deneme...`);
            socket.connect();
          }
        }, delay);
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Socket.IO bağlantısı yeniden kuruldu, Deneme: ${attemptNumber}`);
      reconnectAttemptsRef.current = 0;
      
      // Reconnect timeout'u temizle
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
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