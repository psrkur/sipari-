const socketIO = require('socket.io');

// Socket.IO konfigürasyonu - Tamamen yeniden yazıldı
function configureSocket(server) {
  console.log('🔌 Socket.IO konfigürasyonu başlatılıyor...');
  
  const io = socketIO(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://arsut.net.tr",
        "https://yemek5-frontend.onrender.com",
        "https://yemek5.vercel.app",
        "https://siparisnet.netlify.app",
        "https://cizar.com.tr"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    // Bağlantı yönetimi - optimize edildi
    pingTimeout: 30000,        // 30 saniye
    pingInterval: 25000,       // 25 saniye
    upgradeTimeout: 10000,     // 10 saniye
    allowUpgrades: true,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,    // 1MB
    allowEIO3: false,          // EIO3'ü devre dışı bırak
    // Rate limiting
    maxHttpBufferSize: 1e6,
    // Transport ayarları
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "https://arsut.net.tr",
        "https://yemek5-frontend.onrender.com",
        "https://yemek5.vercel.app",
        "https://siparisnet.netlify.app",
        "https://cizar.com.tr"
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`🚫 CORS reddedildi: ${origin}`);
        callback(null, false);
      }
    }
  });

  // Global io instance'ını export et
  global.io = io;
  
  // Dashboard güncelleme fonksiyonu
  io.updateDashboard = (branchId = 'all') => {
    try {
      const dashboardRoom = `dashboard-${branchId}`;
      io.to(dashboardRoom).emit('dashboardUpdate', {
        timestamp: new Date().toISOString(),
        message: 'Dashboard verileri güncellendi'
      });
      console.log(`📊 Dashboard güncellemesi gönderildi: ${dashboardRoom}`);
    } catch (error) {
      console.error('❌ Dashboard güncelleme hatası:', error);
    }
  };

  // Bağlantı yönetimi - basitleştirildi ve güçlendirildi
  io.on('connection', (socket) => {
    console.log('🔌 Yeni kullanıcı bağlandı:', socket.id);

    // Bağlantı durumu takibi
    let isConnected = true;
    let heartbeatInterval = null;

    // Heartbeat kontrolü - basitleştirildi
    heartbeatInterval = setInterval(() => {
      if (isConnected && socket.connected) {
        try {
          socket.emit('ping');
        } catch (error) {
          console.error(`❌ Heartbeat hatası (${socket.id}):`, error.message);
        }
      }
    }, 25000);

    // Ping/Pong kontrolü
    socket.on('ping', () => {
      try {
        socket.emit('pong');
      } catch (error) {
        console.error(`❌ Pong hatası (${socket.id}):`, error.message);
      }
    });

    socket.on('pong', () => {
      // Pong alındı, bağlantı aktif
      console.log(`💓 Heartbeat alındı: ${socket.id}`);
    });

    // Kullanıcı oda katılımı
    socket.on('joinRoom', (room) => {
      try {
        if (isConnected && socket.connected && room) {
          socket.join(room);
          console.log(`👥 Kullanıcı ${socket.id} odaya katıldı: ${room}`);
        }
      } catch (error) {
        console.error(`❌ Oda katılım hatası (${socket.id}):`, error.message);
      }
    });

    // Oda ayrılma
    socket.on('leaveRoom', (room) => {
      try {
        if (isConnected && socket.connected && room) {
          socket.leave(room);
          console.log(`👋 Kullanıcı ${socket.id} odadan ayrıldı: ${room}`);
        }
      } catch (error) {
        console.error(`❌ Oda ayrılma hatası (${socket.id}):`, error.message);
      }
    });

    // Dashboard güncellemeleri için oda katılımı
    socket.on('joinDashboard', (branchId) => {
      try {
        if (isConnected && socket.connected) {
          const dashboardRoom = `dashboard-${branchId || 'all'}`;
          socket.join(dashboardRoom);
          console.log(`📊 Dashboard odasına katılım: ${socket.id} -> ${dashboardRoom}`);
        }
      } catch (error) {
        console.error(`❌ Dashboard katılım hatası (${socket.id}):`, error.message);
      }
    });

    // Dashboard odasından ayrılma
    socket.on('leaveDashboard', (branchId) => {
      try {
        if (isConnected && socket.connected) {
          const dashboardRoom = `dashboard-${branchId || 'all'}`;
          socket.leave(dashboardRoom);
          console.log(`📊 Dashboard odasından ayrılma: ${socket.id} -> ${dashboardRoom}`);
        }
      } catch (error) {
        console.error(`❌ Dashboard ayrılma hatası (${socket.id}):`, error.message);
      }
    });

    // Bağlantı kesilme
    socket.on('disconnect', (reason) => {
      isConnected = false;
      console.log(`❌ Kullanıcı bağlantısı kesildi: ${socket.id}, Sebep: ${reason}`);
      
      // Heartbeat interval'ını temizle
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // Bağlantı kesilme sebebini logla
      if (reason === 'transport close' || reason === 'ping timeout' || reason === 'io client disconnect') {
        console.log(`📝 Bağlantı kesilme kaydedildi: ${socket.id}, Sebep: ${reason}`);
      }
    });

    // Bağlantı hatası
    socket.on('connect_error', (error) => {
      console.error(`🔌 Bağlantı hatası (${socket.id}):`, error.message);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`❌ Socket hatası (${socket.id}):`, error.message);
    });

    // Test event'i
    socket.on('test', (data) => {
      try {
        socket.emit('testResponse', { 
          message: 'Test başarılı', 
          timestamp: new Date().toISOString(),
          receivedData: data 
        });
        console.log(`✅ Test event'i alındı: ${socket.id}`, data);
      } catch (error) {
        console.error(`❌ Test event hatası (${socket.id}):`, error.message);
      }
    });

    // Bağlantı durumu kontrolü
    socket.on('getStatus', () => {
      try {
        socket.emit('statusResponse', {
          connected: socket.connected,
          id: socket.id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ Status kontrol hatası (${socket.id}):`, error.message);
      }
    });
  });

  // Server durumu kontrolü
  setInterval(() => {
    const connectedSockets = io.sockets.sockets.size;
    console.log(`📊 Aktif bağlantı sayısı: ${connectedSockets}`);
  }, 60000); // Her dakika

  console.log('✅ Socket.IO konfigürasyonu tamamlandı');
  return io;
}

// Socket event'lerini yayınlama fonksiyonları
function emitToRoom(io, room, event, data) {
  try {
    io.to(room).emit(event, data);
    console.log(`📡 Event gönderildi: ${event} -> ${room}`);
  } catch (error) {
    console.error(`❌ Event gönderme hatası: ${event} -> ${room}`, error);
  }
}

function emitToAll(io, event, data) {
  try {
    io.emit(event, data);
    console.log(`📡 Event gönderildi: ${event} -> tüm kullanıcılar`);
  } catch (error) {
    console.error(`❌ Event gönderme hatası: ${event} -> tüm kullanıcılar`, error);
  }
}

function emitToSocket(io, socketId, event, data) {
  try {
    io.to(socketId).emit(event, data);
    console.log(`📡 Event gönderildi: ${event} -> ${socketId}`);
  } catch (error) {
    console.error(`❌ Event gönderme hatası: ${event} -> ${socketId}`, error);
  }
}

module.exports = {
  configureSocket,
  emitToRoom,
  emitToAll,
  emitToSocket
}; 