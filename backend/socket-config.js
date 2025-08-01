const socketIO = require('socket.io');
const performanceMonitor = require('./performance-monitor');

// Socket.IO konfigürasyonu
function configureSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://arsut.net.tr",
        "https://yemek5-frontend.onrender.com",
        "https://yemek5.vercel.app",
        "https://siparisnet.netlify.app"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    // Bağlantı yönetimi iyileştirmeleri
    pingTimeout: 60000, // 60 saniye (artırıldı)
    pingInterval: 25000, // 25 saniye
    upgradeTimeout: 20000, // 20 saniye (artırıldı)
    allowUpgrades: true,
    transports: ['websocket', 'polling'],
    // Memory leak önleme
    maxHttpBufferSize: 1e6, // 1MB
    // Reconnection ayarları
    allowEIO3: true,
    // Heartbeat ayarları iyileştirildi
    heartbeat: {
      interval: 25000,
      timeout: 60000
    },
    // Bağlantı yönetimi iyileştirmeleri
    connectTimeout: 45000, // 45 saniye
    // Rate limiting
    maxHttpBufferSize: 1e6,
    // Transport ayarları
    transports: ['websocket', 'polling'],
    allowRequest: (req, callback) => {
      // CORS kontrolü
      const origin = req.headers.origin;
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://arsut.net.tr",
        "https://yemek5-frontend.onrender.com",
        "https://yemek5.vercel.app",
        "https://siparisnet.netlify.app"
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    }
  });

  // Bağlantı yönetimi
  io.on('connection', (socket) => {
    // Performans izleme
    performanceMonitor.recordConnection(socket.id);
    console.log('🔌 Yeni kullanıcı bağlandı:', socket.id);

    // Bağlantı durumu takibi
    let isConnected = true;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10; // Artırıldı
    let heartbeatInterval = null;

    // Heartbeat kontrolü
    heartbeatInterval = setInterval(() => {
      if (isConnected && socket.connected) {
        socket.emit('ping');
      }
    }, 25000);

    // Ping/Pong kontrolü
    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('pong', () => {
      // Pong alındı, bağlantı aktif
      console.log(`💓 Heartbeat alındı: ${socket.id}`);
    });

    // Kullanıcı oda katılımı
    socket.on('joinRoom', (room) => {
      if (isConnected && socket.connected) {
        socket.join(room);
        console.log(`👥 Kullanıcı ${socket.id} odaya katıldı: ${room}`);
      }
    });

    // Oda ayrılma
    socket.on('leaveRoom', (room) => {
      if (isConnected && socket.connected) {
        socket.leave(room);
        console.log(`👋 Kullanıcı ${socket.id} odadan ayrıldı: ${room}`);
      }
    });

    // Bağlantı kesilme
    socket.on('disconnect', (reason) => {
      isConnected = false;
      performanceMonitor.recordDisconnection(socket.id, reason);
      console.log(`❌ Kullanıcı bağlantısı kesildi: ${socket.id}, Sebep: ${reason}`);
      
      // Heartbeat interval'ını temizle
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // Server-side'da socket.connect() kullanılamaz, client-side'da yapılır
      // Bu sadece log kaydı için
      if (reason === 'transport close' || reason === 'ping timeout' || reason === 'io client disconnect') {
        console.log(`📝 Bağlantı kesilme kaydedildi: ${socket.id}, Sebep: ${reason}`);
      }
    });

    // Bağlantı hatası
    socket.on('connect_error', (error) => {
      performanceMonitor.recordError(error, `Socket ${socket.id}`);
      console.error(`🔌 Bağlantı hatası (${socket.id}):`, error.message);
    });

    // Bağlantı yeniden kuruldu
    socket.on('reconnect', (attemptNumber) => {
      isConnected = true;
      reconnectAttempts = 0;
      performanceMonitor.recordReconnection(socket.id, attemptNumber);
      console.log(`✅ Bağlantı yeniden kuruldu: ${socket.id}, Deneme: ${attemptNumber}`);
      
      // Heartbeat'i yeniden başlat
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(() => {
          if (isConnected && socket.connected) {
            socket.emit('ping');
          }
        }, 25000);
      }
    });

    // Bağlantı yeniden kurma hatası
    socket.on('reconnect_error', (error) => {
      console.error(`❌ Yeniden bağlanma hatası (${socket.id}):`, error.message);
    });

    // Bağlantı yeniden kurma denemesi
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Yeniden bağlanma denemesi: ${socket.id}, Deneme: ${attemptNumber}`);
    });

    // Bağlantı yeniden kurma başarısız
    socket.on('reconnect_failed', () => {
      console.log(`❌ Yeniden bağlanma başarısız: ${socket.id}`);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`❌ Socket hatası (${socket.id}):`, error.message);
    });
  });

  return io;
}

// Socket event'lerini yayınlama fonksiyonları
function emitToRoom(io, room, event, data) {
  io.to(room).emit(event, data);
}

function emitToAll(io, event, data) {
  io.emit(event, data);
}

function emitToSocket(io, socketId, event, data) {
  io.to(socketId).emit(event, data);
}

module.exports = {
  configureSocket,
  emitToRoom,
  emitToAll,
  emitToSocket
}; 