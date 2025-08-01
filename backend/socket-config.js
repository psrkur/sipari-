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
    pingTimeout: 60000, // 60 saniye
    pingInterval: 25000, // 25 saniye
    upgradeTimeout: 10000, // 10 saniye
    allowUpgrades: true,
    transports: ['websocket', 'polling'],
    // Memory leak önleme
    maxHttpBufferSize: 1e6, // 1MB
    // Reconnection ayarları
    allowEIO3: true,
    // Heartbeat ayarları
    heartbeat: {
      interval: 25000,
      timeout: 60000
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
    const maxReconnectAttempts = 5;

    // Ping/Pong kontrolü
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Kullanıcı oda katılımı
    socket.on('joinRoom', (room) => {
      if (isConnected) {
        socket.join(room);
        console.log(`👥 Kullanıcı ${socket.id} odaya katıldı: ${room}`);
      }
    });

    // Oda ayrılma
    socket.on('leaveRoom', (room) => {
      if (isConnected) {
        socket.leave(room);
        console.log(`👋 Kullanıcı ${socket.id} odadan ayrıldı: ${room}`);
      }
    });

    // Bağlantı kesilme
    socket.on('disconnect', (reason) => {
      isConnected = false;
      performanceMonitor.recordDisconnection(socket.id, reason);
      console.log(`❌ Kullanıcı bağlantısı kesildi: ${socket.id}, Sebep: ${reason}`);
      
      // Yeniden bağlanma denemesi
      if (reason === 'transport close' || reason === 'ping timeout') {
        reconnectAttempts++;
        if (reconnectAttempts <= maxReconnectAttempts) {
          console.log(`🔄 Yeniden bağlanma denemesi ${reconnectAttempts}/${maxReconnectAttempts}`);
          setTimeout(() => {
            if (!isConnected) {
              socket.connect();
            }
          }, 1000 * reconnectAttempts); // Exponential backoff
        } else {
          console.log(`❌ Maksimum yeniden bağlanma denemesi aşıldı: ${socket.id}`);
        }
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