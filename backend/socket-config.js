const socketIO = require('socket.io');

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
    }
  });

  // Bağlantı yönetimi
  io.on('connection', (socket) => {
    console.log('🔌 Yeni kullanıcı bağlandı:', socket.id);

    // Kullanıcı oda katılımı
    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`👥 Kullanıcı ${socket.id} odaya katıldı: ${room}`);
    });

    // Oda ayrılma
    socket.on('leaveRoom', (room) => {
      socket.leave(room);
      console.log(`👋 Kullanıcı ${socket.id} odadan ayrıldı: ${room}`);
    });

    // Bağlantı kesilme
    socket.on('disconnect', () => {
      console.log('❌ Kullanıcı bağlantısı kesildi:', socket.id);
    });
  });

  return io;
}

// Socket event'lerini yayınlama fonksiyonları
function emitToRoom(io, room, event, data) {
  io.to(room).emit(event, data);
  console.log(`📡 ${event} event'i ${room} odasına gönderildi:`, data);
}

function emitToAll(io, event, data) {
  io.emit(event, data);
  console.log(`📡 ${event} event'i tüm kullanıcılara gönderildi:`, data);
}

module.exports = {
  configureSocket,
  emitToRoom,
  emitToAll
}; 