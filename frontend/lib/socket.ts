import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

// Socket.IO bağlantı durumu store'u
interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  connectionAttempts: number;
  lastError: string | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

// API base URL'ini al
const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    } else if (hostname.includes('vercel.app')) {
      return 'https://yemek5-backend.onrender.com';
    } else if (hostname.includes('netlify.app')) {
      return 'https://yemek5-backend.onrender.com';
    } else if (hostname.includes('onrender.com')) {
      return 'https://yemek5-backend.onrender.com';
    } else if (hostname === 'arsut.net.tr') {
      return 'https://yemek5-backend.onrender.com';
    } else if (hostname === 'cizar.com.tr') {
      return 'https://yemek5-backend.onrender.com';
    } else {
      return 'https://yemek5-backend.onrender.com';
    }
  }
  
  // Server-side fallback
  return 'https://yemek5-backend.onrender.com';
};

// Socket.IO client store'u
export const useSocketStore = create<SocketStore>((set, get) => {
  let socket: Socket | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let connectionCheckTimer: NodeJS.Timeout | null = null;

  const connect = () => {
    try {
      const store = get();
      
      // Eğer zaten bağlıysa, tekrar bağlanma
      if (store.isConnected && socket?.connected) {
        console.log('🔌 Zaten bağlı, tekrar bağlanılmıyor');
        return;
      }

      // Eski bağlantıyı temizle
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }

      // Timer'ları temizle
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      if (connectionCheckTimer) clearTimeout(connectionCheckTimer);

      const API_BASE_URL = getApiBaseUrl();
      console.log('🔌 Socket.IO bağlantısı kuruluyor:', API_BASE_URL);

      // Socket.IO client oluştur
      socket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
        query: {
          client: 'frontend',
          version: '1.0.0'
        }
      });

      // Bağlantı event'leri
      socket.on('connect', () => {
        console.log('✅ Socket.IO bağlandı:', socket?.id);
        set({ 
          isConnected: true, 
          connectionAttempts: 0, 
          lastError: null 
        });
        
        // Heartbeat başlat
        startHeartbeat();
        
        // Bağlantı durumu kontrolü başlat
        startConnectionCheck();
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO bağlantısı kesildi:', reason);
        set({ isConnected: false });
        
        // Heartbeat ve connection check'i durdur
        stopHeartbeat();
        stopConnectionCheck();
        
        // Yeniden bağlanma denemesi
        if (reason === 'io server disconnect' || reason === 'io client disconnect') {
          console.log('🔄 Manuel yeniden bağlanma başlatılıyor...');
          setTimeout(() => connect(), 2000);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('🔌 Socket.IO bağlantı hatası:', error.message);
        set({ 
          isConnected: false, 
          lastError: error.message,
          connectionAttempts: get().connectionAttempts + 1 
        });
        
        // Hata durumunda yeniden bağlanma
        if (get().connectionAttempts < 5) {
          console.log(`🔄 ${get().connectionAttempts}. yeniden bağlanma denemesi...`);
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => connect(), 3000);
        }
      });

      socket.on('error', (error) => {
        console.error('🔌 Socket.IO genel hatası:', error);
        set({ 
          isConnected: false, 
          lastError: error.message || 'Bilinmeyen hata' 
        });
      });

      // Test event'leri
      socket.on('testResponse', (data) => {
        console.log('✅ Test response alındı:', data);
      });

      socket.on('statusResponse', (data) => {
        console.log('📊 Status response alındı:', data);
      });

      // Dashboard güncellemeleri
      socket.on('dashboardUpdate', (data) => {
        console.log('📊 Dashboard güncellemesi alındı:', data);
      });

      // Ping/Pong
      socket.on('ping', () => {
        if (socket?.connected) {
          socket.emit('pong');
        }
      });

      socket.on('pong', () => {
        console.log('💓 Pong alındı');
      });

      // Global store'a socket'i kaydet
      set({ socket });

    } catch (error) {
      console.error('❌ Socket.IO bağlantı hatası:', error);
      set({ 
        isConnected: false, 
        lastError: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      });
    }
  };

  const disconnect = () => {
    try {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      
      // Timer'ları temizle
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      if (connectionCheckTimer) clearTimeout(connectionCheckTimer);
      
      set({ 
        isConnected: false, 
        socket: null,
        connectionAttempts: 0,
        lastError: null 
      });
      
      console.log('🔌 Socket.IO bağlantısı kesildi');
    } catch (error) {
      console.error('❌ Socket.IO kesme hatası:', error);
    }
  };

  const reconnect = () => {
    console.log('🔄 Socket.IO yeniden bağlanıyor...');
    disconnect();
    setTimeout(() => connect(), 1000);
  };

  const emit = (event: string, data?: any) => {
    try {
      if (socket?.connected) {
        socket.emit(event, data);
        console.log(`📡 Event gönderildi: ${event}`, data);
      } else {
        console.warn('⚠️ Socket bağlı değil, event gönderilemedi:', event);
        // Bağlantı yoksa yeniden bağlan
        connect();
      }
    } catch (error) {
      console.error(`❌ Event gönderme hatası (${event}):`, error);
    }
  };

  const on = (event: string, callback: (...args: any[]) => void) => {
    try {
      if (socket) {
        socket.on(event, callback);
        console.log(`👂 Event listener eklendi: ${event}`);
      }
    } catch (error) {
      console.error(`❌ Event listener ekleme hatası (${event}):`, error);
    }
  };

  const off = (event: string, callback?: (...args: any[]) => void) => {
    try {
      if (socket) {
        if (callback) {
          socket.off(event, callback);
        } else {
          socket.off(event);
        }
        console.log(`👂 Event listener kaldırıldı: ${event}`);
      }
    } catch (error) {
      console.error(`❌ Event listener kaldırma hatası (${event}):`, error);
    }
  };

  // Heartbeat fonksiyonları
  const startHeartbeat = () => {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (socket?.connected) {
        emit('ping');
      }
    }, 30000); // 30 saniyede bir
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  // Bağlantı durumu kontrolü
  const startConnectionCheck = () => {
    if (connectionCheckTimer) clearTimeout(connectionCheckTimer);
    connectionCheckTimer = setInterval(() => {
      if (socket && !socket.connected) {
        console.log('⚠️ Socket bağlantısı kopuk, yeniden bağlanılıyor...');
        reconnect();
      }
    }, 60000); // Her dakika kontrol
  };

  const stopConnectionCheck = () => {
    if (connectionCheckTimer) {
      clearTimeout(connectionCheckTimer);
      connectionCheckTimer = null;
    }
  };

  return {
    socket: null,
    isConnected: false,
    connectionAttempts: 0,
    lastError: null,
    connect,
    disconnect,
    reconnect,
    emit,
    on,
    off
  };
});

// Otomatik bağlantı (client-side'da)
if (typeof window !== 'undefined') {
  // Sayfa yüklendiğinde otomatik bağlan
  window.addEventListener('load', () => {
    setTimeout(() => {
      useSocketStore.getState().connect();
    }, 1000);
  });

  // Sayfa kapanmadan önce bağlantıyı kes
  window.addEventListener('beforeunload', () => {
    useSocketStore.getState().disconnect();
  });

  // Sayfa görünürlük değişikliklerinde bağlantıyı yönet
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Sayfa gizlendiğinde bağlantıyı kes
      useSocketStore.getState().disconnect();
    } else {
      // Sayfa görünür olduğunda yeniden bağlan
      setTimeout(() => {
        useSocketStore.getState().connect();
      }, 1000);
    }
  });
}

// Test fonksiyonları
export const testSocketConnection = () => {
  const { emit, isConnected } = useSocketStore.getState();
  if (isConnected) {
    emit('test', { message: 'Frontend test', timestamp: new Date().toISOString() });
    return true;
  }
  return false;
};

export const getSocketStatus = () => {
  const { emit, isConnected } = useSocketStore.getState();
  if (isConnected) {
    emit('getStatus');
    return true;
  }
  return false;
};

// Dashboard odası yönetimi
export const joinDashboardRoom = (branchId?: string) => {
  const { emit, isConnected } = useSocketStore.getState();
  if (isConnected) {
    emit('joinDashboard', branchId);
    return true;
  }
  return false;
};

export const leaveDashboardRoom = (branchId?: string) => {
  const { emit, isConnected } = useSocketStore.getState();
  if (isConnected) {
    emit('leaveDashboard', branchId);
    return true;
  }
  return false;
};

export default useSocketStore; 