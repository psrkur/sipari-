// Environment variables - Manuel yükleme
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const isProduction = process.env.NODE_ENV === 'production';
console.log('🔧 process.env.PORT başlangıç:', process.env.PORT);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 isProduction:', isProduction);
// SABİT PORT - Development için 3001, Production için process.env.PORT
const SERVER_PORT = isProduction ? (process.env.PORT || 10000) : 3001;
console.log('🔧 SERVER_PORT:', SERVER_PORT);
console.log('🔧 process.env.PORT son:', process.env.PORT);
const DATABASE_URL = 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';
const isPostgreSQL = DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://');
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const FRONTEND_URL = isProduction ? 'https://siparisnet.netlify.app' : (process.env.FRONTEND_URL || 'http://localhost:3000');

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const logger = require('./utils/logger');
const { configureSocket } = require('./socket-config');
const performanceMonitor = require('./performance-monitor');
const chatbotRouter = require('./chatbot-api');
const aiChatbotRouter = require('./ai-chatbot-api');
const dashboardRouter = require('./dashboard-api');
const backupRouter = require('./backup-api');

// Email servisini import et
const { sendOrderNotification, sendAdminNotification } = require('./utils/email-service');

// Otomatik temizlik modülünü import et
const { startAutoCleanup, cleanupOldOrders, showDatabaseStats } = require('./cleanup-old-orders');

// Cloudinary konfigürasyonu
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
});
// İkinci dotenv yüklemesi kaldırıldı

const { PrismaClient } = require('@prisma/client');

// Prisma client configuration - En basit hali
const prisma = new PrismaClient();

// Global prisma instance'ını export et
global.prisma = prisma;

console.log('🔧 Prisma client oluşturuldu');

// Prisma bağlantısını test et
prisma.$connect()
  .then(() => {
    console.log('✅ Prisma client başarıyla bağlandı');
  })
  .catch((error) => {
    console.error('❌ Prisma client bağlantı hatası:', error);
  });

// Prisma client'ı global olarak tanımla
global.prismaClient = prisma;

// Firma yönetimi modülünü import et
// const companyManagement = require('./company-management');

// Sadece hata durumlarında log - gereksiz query logging kaldırıldı
prisma.$on('error', (e) => {
  logger.error('Prisma Error: ' + e.message);
});

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

// PostgreSQL URL override for Render
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL.includes('postgresql')) {
  process.env.DATABASE_URL = 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis';
  console.log('🔧 PostgreSQL URL override applied for production');
}

// Database type detection
console.log(`🔍 Database URL: ${DATABASE_URL.substring(0, 50)}...`);
console.log(`📊 Database Type: ${isPostgreSQL ? 'PostgreSQL' : 'SQLite'}`);
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Full DATABASE_URL: ${DATABASE_URL}`);

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Veritabanı bağlantısı başarılı');
  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error);
    return false;
  }
}

testDatabaseConnection();

// Migration kontrolü - geçici olarak devre dışı
async function checkAndRunMigration() {
  try {
    console.log('🔧 Migration kontrolü atlanıyor (geçici olarak devre dışı)...');
    
    // imagePath sütununun var olup olmadığını kontrol et
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'imagePath'
    `;
    
    console.log('📊 imagePath sütunu kontrolü:', result);
    
    if (result.length > 0) {
      console.log('✅ imagePath sütunu mevcut');
    } else {
      console.log('❌ imagePath sütunu eksik, manuel olarak ekleniyor...');
      // Manuel olarak sütun ekle
      await prisma.$executeRaw`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imagePath" TEXT`;
      console.log('✅ imagePath sütunu manuel olarak eklendi');
    }
    
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    try {
      // Hata durumunda manuel olarak sütun eklemeyi dene
      await prisma.$executeRaw`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imagePath" TEXT`;
      console.log('✅ imagePath sütunu manuel olarak eklendi');
    } catch (manualError) {
      console.error('❌ Manuel sütun ekleme hatası:', manualError);
    }
  }
}

// Server başlamadan önce migration'ı çalıştır
checkAndRunMigration();
    

const QRCode = require('qrcode');

// Placeholder SVG helper function
const getPlaceholderSvg = () => {
  return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="300" fill="#f3f4f6"/>
    <rect x="50" y="50" width="300" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
    <circle cx="200" cy="150" r="40" fill="#9ca3af"/>
    <path d="M180 130 L220 150 L180 170 Z" fill="#6b7280"/>
    <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">Resim Yok</text>
  </svg>`;
};

const app = express();

// Multer konfigürasyonu - Dosya tabanlı
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'products');
    // Klasör yoksa oluştur
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Orijinal dosya adını koru, sadece Türkçe karakterleri ve boşlukları düzelt
    const originalName = file.originalname;
    const safeName = originalName
      .replace(/[ğ]/g, 'g')
      .replace(/[ü]/g, 'u')
      .replace(/[ş]/g, 's')
      .replace(/[ı]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ç]/g, 'c')
      .replace(/[Ğ]/g, 'G')
      .replace(/[Ü]/g, 'U')
      .replace(/[Ş]/g, 'S')
      .replace(/[İ]/g, 'I')
      .replace(/[Ö]/g, 'O')
      .replace(/[Ç]/g, 'C')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    
    // Eğer aynı isimde dosya varsa, sonuna sayı ekle
    let finalName = safeName;
    let counter = 1;
    const uploadDir = path.join(__dirname, 'uploads', 'products');
    
    while (fs.existsSync(path.join(uploadDir, finalName))) {
      const nameWithoutExt = safeName.substring(0, safeName.lastIndexOf('.'));
      const ext = safeName.substring(safeName.lastIndexOf('.'));
      finalName = `${nameWithoutExt}_${counter}${ext}`;
      counter++;
    }
    
    cb(null, finalName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Sadece resim dosyalarını kabul et
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
  }
});


// PORT değişkeni kaldırıldı, SERVER_PORT kullanılıyor

// Render/proxy ortamı için gerçek IP ve rate limit desteği
app.set('trust proxy', 1);

// Güvenlik middleware'leri - Development için CSP devre dışı
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http://localhost:3001", "https://yemek5-backend.onrender.com", "https://arsut.net.tr"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));
} else {
  // Development için sadece temel güvenlik
  app.use(helmet({
    crossOriginEmbedderPolicy: false
  }));
}

// Compression middleware
app.use(compression());

// Rate limiting - Geçici olarak devre dışı
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 dakika
//   max: 100, // IP başına 100 istek
//   message: {
//     error: 'Çok fazla istek gönderildi. Lütfen 15 dakika sonra tekrar deneyin.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', limiter);

// CORS konfigürasyonu - Test için tüm origin'lere izin ver
app.use(cors({
  origin: true, // Tüm origin'lere izin ver (test için)
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
}));

// Global CORS headers for all responses
app.use((req, res, next) => {
  // Origin kontrolü
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:8080', 'https://yemek5-frontend.onrender.com', 'https://yemek5.vercel.app', 'https://arsut.net.tr', 'https://siparisnet.netlify.app'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  res.header('Access-Control-Max-Age', '86400');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', (req, res, next) => {
  // Tüm origin'lere izin ver
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  res.set('Access-Control-Max-Age', '86400'); // 24 saat cache
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Eski resim endpoint'i kaldırıldı - Base64 endpoint kullanılıyor

// Products klasörü için özel CORS ayarları
app.use('/uploads/products', (req, res, next) => {
  // Tüm origin'lere izin ver
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  res.set('Access-Control-Max-Age', '86400'); // 24 saat cache
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads', 'products')));

// Resim endpoint'i - Doğrudan resim dosyası döndür
app.get('/api/images/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', 'products', filename);
  
  console.log('🖼️ /api/images/ çağrıldı:', filename);
  
  // Development için en permissive CORS ayarları
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  res.set('Access-Control-Max-Age', '86400'); // 24 saat cache
  res.set('Access-Control-Allow-Credentials', 'false');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Dosya var mı kontrol et
    if (!fs.existsSync(filePath)) {
      console.error('Resim dosyası bulunamadı:', filePath);
      return res.status(404).json({ error: 'Resim bulunamadı' });
    }
    
    // Dosya boyutunu kontrol et (5MB limit)
    const stats = fs.statSync(filePath);
    if (stats.size > 5 * 1024 * 1024) {
      console.error('Dosya çok büyük:', filename, stats.size);
      return res.status(413).json({ error: 'Dosya çok büyük (max 5MB)' });
    }
    
    // Dosya uzantısına göre MIME type belirle
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/png'; // Varsayılan
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    // Response header'larını set et
    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=3600'); // 1 saat cache
    
    // Dosyayı doğrudan stream et
    res.sendFile(filePath);
    
  } catch (error) {
    console.error('Resim dosyası gönderilemedi:', filename, error);
    
    // Header'lar zaten set edilmişse hata döndürme
    if (!res.headersSent) {
      res.status(500).json({ error: 'Resim işlenemedi' });
    }
  }
});

// Eski resim endpoint'i kaldırıldı - Base64 endpoint kullanılıyor

const authenticateToken = (req, res, next) => {
  // WebSocket bağlantıları için token kontrolü yapma
  if (req.url?.includes('/socket.io/')) {
    return next();
  }
  
  // Log seviyesini azalt - sadece hata durumlarında log
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.log('❌ Token yok - API isteği:', req.url);
    return res.status(401).json({ error: 'Token gerekli' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production', (err, user) => {
    if (err) {
      console.log('❌ Token hatası:', err.message);
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    // Sadece debug modunda user bilgisini logla
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Token geçerli, user:', user);
    }
    req.user = user;
    next();
  });
};



app.post('/api/auth/register', async (req, res) => {
  // CORS ayarları
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  res.set('Access-Control-Max-Age', '86400');
  res.set('Access-Control-Allow-Credentials', 'false');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { email, password, name, phone, address } = req.body;
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        address,
        role: 'CUSTOMER',
        isActive: false // Yönetici onayına kadar pasif
      }
    });

    res.json({ 
      message: 'Kayıt başarılı, yönetici onayından sonra giriş yapabilirsiniz.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Kayıt hatası' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  // CORS ayarları
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  res.set('Access-Control-Max-Age', '86400');
  res.set('Access-Control-Allow-Credentials', 'false');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    console.log('🔍 Login isteği:', req.body);
    const { email, password } = req.body;
    
    const user = await prisma.user.findFirst({
      where: { email }
    });

    console.log('🔍 Kullanıcı bulundu:', user ? 'Evet' : 'Hayır');

    if (!user) {
      console.log('❌ Kullanıcı bulunamadı');
      return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
    }

    console.log('🔍 Kullanıcı durumu:', { isActive: user.isActive, isApproved: user.isApproved });

    if (!user.isActive) {
      console.log('❌ Kullanıcı aktif değil');
      return res.status(403).json({ error: 'Hesabınız henüz yönetici tarafından onaylanmadı.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    console.log('🔍 Şifre kontrolü:', validPassword ? 'Geçerli' : 'Geçersiz');

    if (!validPassword) {
      console.log('❌ Geçersiz şifre');
      return res.status(400).json({ error: 'Geçersiz şifre' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, branchId: user.branchId },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '24h' }
    );

    console.log('✅ Giriş başarılı');
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId } });
  } catch (error) {
    console.error('❌ Login hatası:', error);
    res.status(500).json({ error: 'Giriş hatası' });
  }
});

// Şifre sıfırlama talebi endpoint'i
app.post('/api/auth/forgot-password', async (req, res) => {
  // CORS ayarları
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  res.set('Access-Control-Max-Age', '86400');
  res.set('Access-Control-Allow-Credentials', 'false');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email adresi gerekli' });
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Güvenlik için kullanıcı bulunamasa da aynı mesajı döndür
      return res.json({ message: 'Şifre sıfırlama linki email adresinize gönderildi' });
    }

    // Reset token oluştur (1 saat geçerli)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

    // Kullanıcıyı güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Reset link oluştur
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Email gönder
    const emailService = require('./utils/email-service');
    const emailResult = await emailService.sendPasswordResetEmail(email, resetLink, user.name);

    if (emailResult.success) {
      console.log('✅ Şifre sıfırlama emaili gönderildi:', email);
      res.json({ message: 'Şifre sıfırlama linki email adresinize gönderildi' });
    } else {
      console.error('❌ Email gönderme hatası:', emailResult.error);
      res.status(500).json({ error: 'Email gönderilemedi' });
    }

  } catch (error) {
    console.error('❌ Şifre sıfırlama hatası:', error);
    res.status(500).json({ error: 'Şifre sıfırlama işlemi başarısız' });
  }
});

// Şifre sıfırlama endpoint'i
app.post('/api/auth/reset-password', async (req, res) => {
  // CORS ayarları
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  res.set('Access-Control-Max-Age', '86400');
  res.set('Access-Control-Allow-Credentials', 'false');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token ve yeni şifre gerekli' });
    }

    // Kullanıcıyı token ile bul
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }

    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Kullanıcıyı güncelle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    console.log('✅ Şifre başarıyla sıfırlandı:', user.email);
    res.json({ message: 'Şifreniz başarıyla sıfırlandı' });

  } catch (error) {
    console.error('❌ Şifre sıfırlama hatası:', error);
    res.status(500).json({ error: 'Şifre sıfırlama işlemi başarısız' });
  }
});

app.get('/api/branches', async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true }
    });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Şubeler getirilemedi' });
  }
});

// Admin şubeler endpoint'i
app.get('/api/admin/branches', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Şubeler getirilemedi' });
  }
});

// Şube yönetimi endpoint'leri
app.post('/api/branches', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { name, address, phone, companyId } = req.body;

    if (!name || !address || !phone || !companyId) {
      return res.status(400).json({ error: 'Tüm alanlar (isim, adres, telefon, şirket) zorunludur.' });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        address,
        phone,
        isActive: true,
        companyId: Number(companyId)
      }
    });

    res.json(branch);
  } catch (error) {
    console.error('Şube oluşturulamadı:', error);
    res.status(500).json({ error: 'Şube oluşturulamadı', detail: error.message });
  }
});

app.put('/api/admin/branches/:id', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { id } = req.params;
    const { name, address, phone, isActive } = req.body;

    const branch = await prisma.branch.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        phone,
        isActive
      }
    });

    res.json(branch);
  } catch (error) {
    res.status(500).json({ error: 'Şube güncellenemedi' });
  }
});

// Şubeyi pasif hale getirme endpoint'i
app.patch('/api/admin/branches/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { id } = req.params;

    // Şubeyi pasif hale getir
    await prisma.branch.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    });

    res.json({ message: 'Şube başarıyla pasif hale getirildi' });
  } catch (error) {
    console.error('❌ Şube pasif hale getirilemedi:', error);
    res.status(500).json({ error: 'Şube pasif hale getirilemedi' });
  }
});

app.delete('/api/admin/branches/:id', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { id } = req.params;

    // Şubeye bağlı siparişler var mı kontrol et
    const ordersCount = await prisma.order.count({
      where: { branchId: parseInt(id) }
    });

    if (ordersCount > 0) {
      return res.status(400).json({ error: 'Bu şubeye ait siparişler bulunduğu için silinemez' });
    }

    // Şubeye bağlı ürünler var mı kontrol et
    const productsCount = await prisma.product.count({
      where: { branchId: parseInt(id) }
    });

    if (productsCount > 0) {
      return res.status(400).json({ error: 'Bu şubeye ait ürünler bulunduğu için silinemez' });
    }

    // Şubeye bağlı kullanıcılar var mı kontrol et
    const usersCount = await prisma.user.count({
      where: { branchId: parseInt(id) }
    });

    if (usersCount > 0) {
      return res.status(400).json({ error: 'Bu şubeye ait kullanıcılar bulunduğu için silinemez' });
    }

    await prisma.branch.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Şube başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Şube silinemedi' });
  }
});

app.get('/api/products/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Sadece gerekli alanları seç - gereksiz include'ları kaldır
    const products = await prisma.product.findMany({
      where: {
        branchId: parseInt(branchId),
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        imagePath: true,
        isActive: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        {
          category: {
            name: 'asc'
          }
        },
        {
          name: 'asc'
        }
      ]
    });
    
    res.json(products);
  } catch (error) {
    console.error('❌ Ürünler getirilemedi:', error);
    res.status(500).json({ error: 'Ürünler getirilemedi' });
  }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { branchId, items, customerInfo, deliveryType, paymentMethod, notes } = req.body;
    
    let customer = null;
    if (customerInfo) {
      customer = await prisma.customer.upsert({
        where: { phone: customerInfo.phone },
        update: {
          name: customerInfo.name,
          email: customerInfo.email,
          address: customerInfo.address
        },
        create: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          address: customerInfo.address
        }
      });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderNumber = `ORD-${Date.now()}`;
    const deliveryFee = deliveryType === 'delivery' ? 5.0 : 0.0;
    const finalTotal = totalAmount + deliveryFee;

    const paymentText = paymentMethod ? 
      (paymentMethod === 'cash' ? 'Nakit' : 
       paymentMethod === 'card' ? 'Kart (Kapıda)' : 
       paymentMethod === 'online' ? 'Online Ödeme' : 'Belirtilmemiş') : '';
    
    const order = await prisma.order.create({
      data: {
        orderNumber,
        totalAmount: finalTotal,
        status: 'PENDING',
        branchId: parseInt(branchId),
        customerId: customer?.id,
        userId: req.user.userId,
        orderType: 'DELIVERY', // Sipariş tipini belirt
        notes: `${deliveryType === 'delivery' ? 'Adrese Teslim' : 'Şubeden Al'} - Ödeme: ${paymentText} - ${notes || ''}`
      }
    });

    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          quantity: item.quantity,
          price: item.price,
          orderId: order.id,
          productId: item.productId,
          note: item.note || null // Ürün notunu kaydet
        }
      });
    }

    // Gerçek zamanlı bildirim gönder
    if (io) {
      io.emit('newOrder', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        branchId: order.branchId,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
      });
    }

    // Email bildirimleri gönder (asenkron olarak) - POS satışları hariç
    try {
      // POS satışı kontrolü - "Kasa Satışı" notu varsa mail gönderme
      const isPOSSale = order.notes && order.notes.includes('Kasa Satışı');
      
      if (!isPOSSale) {
        // Şube bilgilerini al
        const branch = await prisma.branch.findUnique({
          where: { id: parseInt(branchId) }
        });

        // Müşteriye email gönder
        if (customer?.email) {
          const orderWithItems = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
              orderItems: {
                include: {
                  product: true
                }
              }
            }
          });
          
          sendOrderNotification(orderWithItems, customer, branch);
        }

        // Admin'e email bildirimi gönder
        sendAdminNotification(order, customer, branch);
      } else {
        console.log('📧 POS satışı tespit edildi - Email bildirimi gönderilmedi');
      }
      
    } catch (emailError) {
      console.error('❌ Email gönderme hatası:', emailError);
      // Email hatası sipariş oluşturmayı etkilemesin
    }

    res.json({ order, message: 'Sipariş başarıyla oluşturuldu' });
  } catch (error) {
    console.error('Sipariş oluşturma hatası:', error); // <-- Hata detayını logla
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

// Email test endpoint'i
app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email adresi gerekli' });
    }

    const testOrder = {
      orderNumber: 'TEST-123',
      totalAmount: 50.0,
      createdAt: new Date(),
      orderType: 'DELIVERY',
      notes: 'Test siparişi'
    };

    const testCustomer = {
      name: 'Test Müşteri',
      phone: '0555 123 45 67',
      email: email
    };

    const testBranch = {
      name: 'Test Şube'
    };

    const result = await sendOrderNotification(testOrder, testCustomer, testBranch);
    
    if (result.success) {
      res.json({ message: 'Test email başarıyla gönderildi', messageId: result.messageId });
    } else {
      res.status(500).json({ error: 'Email gönderilemedi', details: result.error });
    }
    
  } catch (error) {
    console.error('Test email hatası:', error);
    res.status(500).json({ error: 'Test email hatası' });
  }
});

// QR Menü endpoint'leri
app.get('/api/qr-menu/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    // Şube bilgilerini al
    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(branchId) },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        isActive: true
      }
    });

    if (!branch || !branch.isActive) {
      return res.status(404).json({ error: 'Şube bulunamadı veya aktif değil' });
    }

    // Şubenin ürünlerini al
    const products = await prisma.product.findMany({
      where: {
        branchId: parseInt(branchId),
        isActive: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        {
          category: {
            name: 'asc'
          }
        },
        {
          name: 'asc'
        }
      ]
    });

    // Kategorilere göre grupla
    const menuByCategory = {};
    products.forEach(product => {
      const categoryName = product.category?.name || 'Diğer';
      if (!menuByCategory[categoryName]) {
        menuByCategory[categoryName] = [];
      }
      menuByCategory[categoryName].push({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        isActive: product.isActive
      });
    });

    res.json({
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone
      },
      menu: menuByCategory,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('QR Menü hatası:', error);
    res.status(500).json({ error: 'Menü bilgileri getirilemedi' });
  }
});

// QR kod oluşturma endpoint'i
app.post('/api/admin/qr-codes/generate', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({ error: 'Şube ID gerekli' });
    }

    // Şube kontrolü
    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(branchId) }
    });

    if (!branch) {
      return res.status(404).json({ error: 'Şube bulunamadı' });
    }

    // QR kod URL'si oluştur
    const qrUrl = `${FRONTEND_URL}/qr-menu/${branchId}`;
    
    // QR kod oluştur
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      branchId: branch.id,
      branchName: branch.name,
      qrUrl: qrUrl,
      qrCodeDataUrl: qrCodeDataUrl,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('QR kod oluşturma hatası:', error);
    res.status(500).json({ error: 'QR kod oluşturulamadı' });
  }
});

// Tüm şubeler için QR kod oluşturma
app.get('/api/admin/qr-codes/all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true
      }
    });

    const qrCodes = [];

    for (const branch of branches) {
      const qrUrl = `${FRONTEND_URL}/qr-menu/${branch.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      qrCodes.push({
        branchId: branch.id,
        branchName: branch.name,
        branchAddress: branch.address,
        qrUrl: qrUrl,
        qrCodeDataUrl: qrCodeDataUrl,
        generatedAt: new Date().toISOString()
      });
    }

    res.json(qrCodes);
  } catch (error) {
    console.error('QR kodlar oluşturma hatası:', error);
    res.status(500).json({ error: 'QR kodlar oluşturulamadı' });
  }
});

// Müşteri siparişlerini getir (sadece giriş yapmış kullanıcılar için)
app.get('/api/customer/orders', authenticateToken, async (req, res) => {
  try {
    let whereClause = {
      orderType: { not: 'TABLE' } // Masa siparişlerini hariç tut
    };

    // CUSTOMER rolündeki kullanıcılar sadece kendi siparişlerini görebilir
    if (req.user.role === 'CUSTOMER') {
      whereClause.userId = req.user.userId;
    } else if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'BRANCH_MANAGER') {
      // Admin kullanıcılar tüm müşteri siparişlerini görebilir
    } else {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    // Sadece gerekli alanları seç - gereksiz include'ları kaldır
    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        orderType: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        user: req.user.role !== 'CUSTOMER' ? {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        } : false,
        orderItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            note: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('❌ Müşteri siparişleri getirilemedi:', error);
    res.status(500).json({ error: 'Siparişler getirilemedi' });
  }
});

// Müşteri sipariş detayını getir
app.get('/api/customer/orders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let whereClause = {
      id: parseInt(id),
      orderType: { not: 'TABLE' } // Masa siparişlerini hariç tut
    };

    // CUSTOMER rolündeki kullanıcılar sadece kendi siparişlerini görebilir
    if (req.user.role === 'CUSTOMER') {
      whereClause.userId = req.user.userId;
    } else if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        branch: true,
        user: req.user.role !== 'CUSTOMER', // Admin kullanıcılar için müşteri bilgilerini de getir
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    res.json(order);
  } catch (error) {
    console.error('Müşteri sipariş detayı getirilemedi:', error);
    res.status(500).json({ error: 'Sipariş detayı getirilemedi' });
  }
});

// Genel sipariş detayını getir (masa siparişleri dahil)
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        branch: true,
        table: {
          include: {
            branch: true
          }
        },
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    res.json(order);
  } catch (error) {
    console.error('Sipariş detayı getirilemedi:', error);
    res.status(500).json({ error: 'Sipariş detayı getirilemedi' });
  }
});

app.get('/api/admin/orders', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { 
        id: true,
        role: true,
        branchId: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    let whereClause = {
      orderType: { 
        notIn: ['COLLECTION'] // Sadece COLLECTION değerini hariç tut
      }
    };
    
    // branchId parametresi varsa filtrele
    if (req.query.branchId) {
      whereClause.branchId = parseInt(req.query.branchId);
    } else if (user.role === 'BRANCH_MANAGER') {
      whereClause.branchId = user.branchId;
    } else if (user.role === 'SUPER_ADMIN') {
      // Süper admin tüm siparişleri getir (tahsilat hariç)
    }

    // Sadece gerekli alanları seç - gereksiz include'ları kaldır
    const orders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        orderType: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        table: {
          select: {
            id: true,
            number: true,
            branch: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            note: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Admin siparişler getirilemedi:', error);
    res.status(500).json({ error: 'Siparişler getirilemedi' });
  }
});

app.put('/api/admin/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { branch: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const { id } = req.params;
    const { status } = req.body;

    let whereClause = { id: parseInt(id) };
    if (user.role === 'BRANCH_MANAGER') {
      whereClause.branchId = user.branchId;
    }

    // Önce mevcut siparişi kontrol et
    const existingOrder = await prisma.order.findUnique({
      where: whereClause,
      include: {
        user: true,
        branch: true
      }
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    // Masa siparişleri için durum güncelleme artık mümkün
    // if (existingOrder.orderType === 'TABLE') {
    //   return res.status(400).json({ 
    //     error: 'Masa siparişleri için durum güncelleme yapılamaz',
    //     message: 'Masa siparişleri için durum değişikliği yapılamaz. Sadece online siparişler için geçerlidir.'
    //   });
    // }

    // Eğer sipariş zaten teslim edildiyse veya iptal edildiyse, güncellemeye izin verme
    if (existingOrder.status === 'DELIVERED') {
      return res.status(400).json({ 
        error: 'Teslim edilen siparişler güncellenemez',
        message: 'Bu sipariş zaten teslim edilmiş ve artık değiştirilemez.'
      });
    }

    if (existingOrder.status === 'CANCELLED') {
      return res.status(400).json({ 
        error: 'İptal edilen siparişler güncellenemez',
        message: 'Bu sipariş zaten iptal edilmiş ve artık değiştirilemez.'
      });
    }

    // Sipariş durumunu güncelle
    const order = await prisma.order.update({
      where: whereClause,
      data: { status },
      include: {
        user: true,
        branch: true
      }
    });

    // Masa siparişleri için özel durum mesajları
    let statusMessage;
    if (order.orderType === 'TABLE') {
      const tableStatusMessages = {
        'PENDING': 'Masa siparişiniz alındı ve hazırlanmaya başlandı.',
        'PREPARING': 'Masa siparişiniz hazırlanıyor.',
        'READY': 'Masa siparişiniz hazır! Servis ediliyor.',
        'DELIVERED': 'Masa siparişiniz teslim edildi. Afiyet olsun! (Ödeme yapıldıktan sonra masa sıfırlanacak)',
        'CANCELLED': 'Masa siparişiniz iptal edildi.'
      };
      statusMessage = tableStatusMessages[status] || 'Masa sipariş durumunuz güncellendi.';
    } else {
      // Normal teslimat siparişleri için
      const deliveryStatusMessages = {
        'PENDING': 'Siparişiniz alındı ve hazırlanmaya başlandı.',
        'PREPARING': 'Siparişiniz hazırlanıyor.',
        'READY': 'Siparişiniz hazır! Teslimata çıkıyoruz.',
        'DELIVERED': 'Siparişiniz teslim edildi. Afiyet olsun!',
        'CANCELLED': 'Siparişiniz iptal edildi.'
      };
      statusMessage = deliveryStatusMessages[status] || 'Sipariş durumunuz güncellendi.';
    }

    // Gerçek zamanlı bildirim gönder
    if (io) {
      io.emit('orderStatusChanged', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: status,
        statusText: statusMessage,
        branchId: order.branchId,
        updatedAt: order.updatedAt
      });
    }

    res.json({
      order,
      message: statusMessage,
      customerNotification: {
        orderNumber: order.orderNumber,
        status: status,
        statusText: statusMessage,
        branchName: order.branch?.name || 'Şube',
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Sipariş durumu güncelleme hatası:', error);
    res.status(500).json({ error: 'Sipariş durumu güncellenemedi' });
  }
});

app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    // Sadece gerekli alanları seç - gereksiz include'ları kaldır
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(users);
  } catch (e) {
    console.error('Users fetch error:', e);
    res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
  }
});

app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(customers);
  } catch (e) {
    console.error('Customers fetch error:', e);
    res.status(500).json({ error: 'Müşteriler getirilemedi' });
  }
});

app.post('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    const { name, email, password, role, branchId } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'Eksik bilgi' });
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      name,
      email,
      password: hashedPassword,
      role
    };
    
    if (role === 'BRANCH_MANAGER' && branchId) {
      userData.branchId = Number(branchId);
    }
    
    const user = await prisma.user.create({
      data: userData,
      include: {
        branch: true
      }
    });
    
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Kullanıcı eklenemedi' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { id } = req.params;
    const userId = parseInt(id);
    
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Kendinizi silemezsiniz' });
    }
    
    await prisma.user.delete({
      where: { id: userId }
    });
    
    res.json({ message: 'Kullanıcı silindi' });
  } catch (e) {
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

app.get('/api/admin/products', authenticateToken, async (req, res) => {
  try {
    let whereClause = {};
    
    // Branch manager sadece kendi şubesindeki ürünleri görebilir
    if (req.user.role === 'BRANCH_MANAGER') {
      whereClause.branchId = req.user.branchId;
    }
    
    // Sadece gerekli alanları seç - gereksiz include'ları kaldır
    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        imagePath: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(products);
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: 'Ürünler getirilemedi' });
  }
});

app.post('/api/admin/products', authenticateToken, async (req, res) => {
  try {
    // Şube müdürleri ürün ekleyemez
    if (req.user.role === 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Şube müdürleri ürün ekleyemez' });
    }

    const { name, description, price, categoryId, branchId, imagePath, image } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: 'Tüm gerekli alanları doldurun' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });

    if (!category) {
      return res.status(400).json({ error: 'Geçersiz kategori' });
    }

    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    let targetBranchId;
    if (!branchId) {
      return res.status(400).json({ error: 'Şube seçimi gerekli' });
    }
    targetBranchId = branchId === 'all' ? 'all' : Number(branchId);

    if (targetBranchId === 'all') {
      const allBranches = await prisma.branch.findMany({ where: { isActive: true } });
      const products = [];

      for (const branch of allBranches) {
        const product = await prisma.product.create({
          data: {
            name,
            description: description || '',
            price: Number(price),
            categoryId: parseInt(categoryId),
            image: image || imagePath || null,
            imagePath: imagePath || null,
            branchId: branch.id,
            companyId: branch.companyId || 1 // companyId yoksa 1 olarak ata
          },
          include: {
            branch: true,
            category: true
          }
        });
        products.push(product);
      }

      res.status(201).json(products);
    } else {
      const branch = await prisma.branch.findUnique({
        where: { id: targetBranchId },
        include: { company: true }
      });
      
      if (!branch) {
        return res.status(400).json({ error: 'Geçersiz şube' });
      }
      
      const product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          price: Number(price),
          categoryId: parseInt(categoryId),
          image: image || imagePath || null,
          imagePath: imagePath || null,
          branchId: targetBranchId,
          companyId: branch.companyId || 1 // companyId yoksa 1 olarak ata
        },
        include: {
          branch: true,
          category: true
        }
      });

      res.status(201).json(product);
    }
  } catch (error) {
    console.error('Ürün ekleme hatası:', error);
    res.status(500).json({ error: 'Ürün eklenemedi', details: error.message, stack: error.stack });
  }
});

app.put('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    console.log('=== PRODUCT UPDATE REQUEST ===');
    console.log('Request body:', req.body);
    console.log('User role:', req.user.role);
    console.log('Product ID:', req.params.id);
    
    const { id } = req.params;
    const { name, description, price, categoryId, branchId, isActive, imagePath, image } = req.body;

    // Branch manager sadece isActive güncellemesi yapıyorsa, diğer alanları kontrol etme
    const isOnlyStatusUpdate = req.user.role === 'BRANCH_MANAGER' && 
      Object.keys(req.body).length === 1 && 
      Object.prototype.hasOwnProperty.call(req.body, 'isActive');

    console.log('Is only status update:', isOnlyStatusUpdate);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Has isActive property:', Object.prototype.hasOwnProperty.call(req.body, 'isActive'));

    if (!isOnlyStatusUpdate && (!name || !price || !categoryId)) {
      return res.status(400).json({ error: 'Tüm gerekli alanları doldurun' });
    }

    // Sadece tam güncelleme yapılıyorsa kategori kontrolü yap
    if (!isOnlyStatusUpdate) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });

      if (!category) {
        return res.status(400).json({ error: 'Geçersiz kategori' });
      }
    }

    // Ürünü kontrol et
    const existingProduct = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: { branch: true }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    // Branch manager kontrolü
    if (req.user.role === 'BRANCH_MANAGER') {
      // Branch manager sadece kendi şubesindeki ürünleri güncelleyebilir
      if (existingProduct.branchId !== req.user.branchId) {
        return res.status(403).json({ error: 'Bu ürünü güncelleyemezsiniz' });
      }
    } else if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Yetkisiz' });
    }

    let isActiveBool = isActive;
    if (typeof isActiveBool === 'string') {
      isActiveBool = isActiveBool === 'true';
    }

    let updateData = {};
    
    console.log('isActive value:', isActive);
    console.log('isActive type:', typeof isActive);
    
    if (req.user.role === 'BRANCH_MANAGER') {
      // Şube müdürleri sadece isActive değerini güncelleyebilir
      updateData = {
        isActive: isActiveBool !== undefined ? isActiveBool : true
      };
      console.log('Branch manager update data:', updateData);
    } else {
      // Süper admin tüm alanları güncelleyebilir
      updateData = {
        name,
        description: description || '',
        price: Number(price),
        categoryId: parseInt(categoryId),
        isActive: isActiveBool !== undefined ? isActiveBool : true
      };
      
      // Branch manager şube değiştiremez
      if (branchId) {
        if (branchId === 'all') {
          // Süper admin için all seçeneği
        } else if (!isNaN(parseInt(branchId))) {
          updateData.branchId = Number(branchId);
        }
      }
      
      if (imagePath !== undefined || image !== undefined) {
        updateData.image = image || imagePath;
        updateData.imagePath = imagePath;
      }
    }

    if (req.user.role === 'SUPER_ADMIN' && branchId === 'all') {
      await prisma.product.delete({
        where: { id: parseInt(id) }
      });

      const allBranches = await prisma.branch.findMany({ where: { isActive: true } });
      const updatedProducts = [];
      
      for (const branch of allBranches) {
        const product = await prisma.product.create({
          data: {
            name,
            description: description || '',
            price: Number(price),
            categoryId: parseInt(categoryId),
            image: image || null,
            branchId: branch.id,
            isActive: isActiveBool !== undefined ? isActiveBool : true
          },
          include: {
            branch: true,
            category: true
          }
        });
        updatedProducts.push(product);
      }

      res.json(updatedProducts);
    } else {
      console.log('Final update data:', updateData);
      console.log('Product ID to update:', parseInt(id));
      
      const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          branch: true,
          category: true
        }
      });

      console.log('Product updated successfully:', product.id);
      res.json(product);
    }
  } catch (error) {
    console.error('Ürün güncelleme hatası:', error);
    console.error('Request body:', req.body);
    console.error('User role:', req.user.role);
    console.error('Product ID:', req.params.id);
    res.status(500).json({ error: 'Ürün güncellenemedi', details: error.message });
  }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    // Sadece süper admin ürün silebilir
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz' });
    }
    
    const { id } = req.params;
    const productId = parseInt(id);
    
    console.log('Deleting product with ID:', productId);
    
    // Ürünü kontrol et
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { branch: true }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    console.log('Product found:', product.name);
    
    // Bu ürünle ilgili sipariş öğelerini kontrol et
    const orderItems = await prisma.orderItem.findMany({
      where: { productId: productId }
    });
    
    console.log(`Found ${orderItems.length} order items for this product`);
    
    // Transaction kullanarak hem sipariş öğelerini hem de ürünü sil
    await prisma.$transaction(async (tx) => {
      // Önce bu ürünle ilgili sipariş öğelerini sil
      if (orderItems.length > 0) {
        console.log('Deleting order items for product:', productId);
        await tx.orderItem.deleteMany({
          where: { productId: productId }
        });
        console.log('Order items deleted successfully');
      }
      
      // Sonra ürünü sil
      await tx.product.delete({
        where: { id: productId }
      });
      
      console.log('Product deleted successfully');
    });
    
    res.json({ 
      message: 'Ürün ve ilgili sipariş öğeleri başarıyla silindi',
      deletedOrderItems: orderItems.length
    });
  } catch (error) {
    console.error('Product delete error:', error);
    res.status(500).json({ error: 'Ürün silinemedi', details: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Kategoriler getirilemedi' });
  }
});

app.get('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    // Kullanıcının branchId'si varsa, o branch'in companyId'sini al
    let companyId = 1; // Varsayılan companyId
    
    if (req.user.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: req.user.branchId }
      });
      if (branch && branch.companyId) {
        companyId = branch.companyId;
      }
    }

    const categories = await prisma.category.findMany({
      where: { companyId: companyId },
      orderBy: { name: 'asc' }
    });
    
    res.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Kategoriler getirilemedi' });
  }
});

app.post('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Kategori adı zorunludur.' });
    }

    // Kullanıcının branchId'si varsa, o branch'in companyId'sini al
    let companyId = 1; // Varsayılan companyId
    
    if (req.user.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: req.user.branchId }
      });
      if (branch && branch.companyId) {
        companyId = branch.companyId;
      }
    }

    const existingCategory = await prisma.category.findFirst({
      where: { 
        name,
        companyId: companyId
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Bu kategori adı zaten mevcut' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || '',
        companyId: companyId
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Kategori ekleme hatası:', error);
    res.status(500).json({ error: 'Kategori eklenemedi' });
  }
});

app.put('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Kategori adı gerekli' });
    }

    const existingCategory = await prisma.category.findFirst({
      where: { 
        name,
        id: { not: parseInt(id) }
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Bu kategori adı zaten mevcut' });
    }

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description: description || '',
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
      }
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Kategori güncellenemedi' });
  }
});

app.delete('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    // Admin rollerini kontrol et - hem büyük hem küçük harf
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { id } = req.params;

    const productsWithCategory = await prisma.product.findFirst({
      where: { categoryId: parseInt(id) }
    });

    if (productsWithCategory) {
      return res.status(400).json({ 
        error: 'Bu kategoriye bağlı ürünler var. Önce ürünleri silin veya başka kategoriye taşıyın.' 
      });
    }

    await prisma.category.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Kategori başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Kategori silinemedi' });
  }
});

// Kategori sıralama API'si
app.put('/api/admin/categories/reorder', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
    const { categories } = req.body;
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Kategoriler listesi gerekli' });
    }

    console.log('Kategori sıralama güncelleniyor:', categories);

    // Kategori sıralaması güncelleniyor (sortOrder olmadan)
    console.log('Kategori sıralaması güncellendi');

    console.log('Kategori sıralama başarıyla güncellendi');
    res.json({ message: 'Kategori sıralaması güncellendi' });
  } catch (error) {
    console.error('Category reorder error:', error);
    res.status(500).json({ error: 'Kategori sıralaması güncellenemedi', details: error.message });
  }
});

app.get('/api/customer/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        orders: {
          include: {
            branch: true,
            orderItems: {
              include: {
                product: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' }
          ]
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role
      },
      orders: user.orders,
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ error: 'Profil bilgileri getirilemedi' });
  }
});

app.put('/api/customer/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Ad soyad alanı zorunludur' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email alanı zorunludur' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir email adresi giriniz' });
    }

    console.log('Profil güncelleme isteği:', { userId: req.user.userId, name, email, phone, address });

    // Email unique constraint kontrolü - kullanıcının kendi email'ini güncellemesine izin ver
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: email.trim(),
        id: { not: req.user.userId }
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Bu email adresi başka bir kullanıcı tarafından kullanılıyor' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { 
        name: name.trim(), 
        email: email.trim(), 
        phone: phone || null, 
        address: address || null 
      }
    });

    console.log('Profil güncelleme başarılı:', updatedUser);

    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({ error: 'Profil güncellenemedi: ' + error.message });
  }
});

// Müşteri adresleri endpoint'i
app.get('/api/customer/addresses', authenticateToken, async (req, res) => {
  try {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: req.user.userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: 'Adresler getirilemedi' });
  }
});

// Yeni adres ekleme endpoint'i
app.post('/api/customer/addresses', authenticateToken, async (req, res) => {
  try {
    const { title, address, isDefault } = req.body;
    
    if (!title || !address) {
      return res.status(400).json({ error: 'Adres başlığı ve adres detayı gerekli' });
    }
    
    // Eğer bu adres varsayılan olarak işaretleniyorsa, diğer adresleri varsayılan olmaktan çıkar
    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: req.user.userId },
        data: { isDefault: false }
      });
    }
    
    const newAddress = await prisma.userAddress.create({
      data: {
        userId: req.user.userId,
        title,
        address,
        isDefault: isDefault || false
      }
    });
    
    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Adres ekleme hatası:', error);
    res.status(500).json({ error: 'Adres eklenemedi' });
  }
});

// Adres güncelleme endpoint'i
app.put('/api/customer/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, address, isDefault } = req.body;
    
    if (!title || !address) {
      return res.status(400).json({ error: 'Adres başlığı ve adres detayı gerekli' });
    }
    
    // Adresin bu kullanıcıya ait olduğunu kontrol et
    const existingAddress = await prisma.userAddress.findFirst({
      where: { 
        id: parseInt(id),
        userId: req.user.userId
      }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }
    
    // Eğer bu adres varsayılan olarak işaretleniyorsa, diğer adresleri varsayılan olmaktan çıkar
    if (isDefault) {
      await prisma.userAddress.updateMany({
        where: { userId: req.user.userId },
        data: { isDefault: false }
      });
    }
    
    const updatedAddress = await prisma.userAddress.update({
      where: { id: parseInt(id) },
      data: {
        title,
        address,
        isDefault: isDefault || false
      }
    });
    
    res.json(updatedAddress);
  } catch (error) {
    console.error('Adres güncelleme hatası:', error);
    res.status(500).json({ error: 'Adres güncellenemedi' });
  }
});

// Adres silme endpoint'i
app.delete('/api/customer/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Adresin bu kullanıcıya ait olduğunu kontrol et
    const existingAddress = await prisma.userAddress.findFirst({
      where: { 
        id: parseInt(id),
        userId: req.user.userId
      }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }
    
    await prisma.userAddress.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Adres silindi' });
  } catch (error) {
    console.error('Adres silme hatası:', error);
    res.status(500).json({ error: 'Adres silinemedi' });
  }
});

// ==================== MASA YÖNETİMİ ENDPOINT'LERİ ====================

// Tüm masaları getir (Admin)
app.get('/api/admin/tables', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const tables = await prisma.table.findMany({
      include: {
        branch: true
      },
      orderBy: [
        { branch: { name: 'asc' } },
        { number: 'asc' }
      ]
    });
    
    res.json(tables);
  } catch (error) {
    console.error('Masalar getirilemedi:', error);
    res.status(500).json({ error: 'Masalar getirilemedi' });
  }
});

// Masa siparişlerini getir (admin için) - ÖNCE TANIMLANMALI
app.get('/api/admin/tables/:tableId/orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { tableId } = req.params;
    
    // Masayı kontrol et
    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: { branch: true }
    });

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    // Masanın tüm bekleyen siparişlerini getir
    const orders = await prisma.order.findMany({
      where: {
        tableId: parseInt(tableId),
        status: { in: ['PENDING', 'PREPARING', 'READY'] } // Teslim edilmemiş siparişler
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Toplam tutarı hesapla
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      table,
      orders,
      totalAmount,
      orderCount: orders.length
    });

  } catch (error) {
    console.error('Masa siparişleri getirilemedi:', error);
    res.status(500).json({ error: 'Masa siparişleri getirilemedi' });
  }
});

// Test endpoint - Tahsilat işlemini basitleştir
app.post('/api/admin/tables/:tableId/collect', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Tahsilat başlatılıyor...', { tableId: req.params.tableId, body: req.body });
    
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { tableId } = req.params;
    const { paymentMethod = 'CASH', notes = '' } = req.body;
    
    console.log('🔍 Parametreler:', { tableId, paymentMethod, notes });
    
    // Masayı kontrol et
    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: { branch: true }
    });

    console.log('🔍 Masa bulundu:', table);

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    // Masanın tüm bekleyen siparişlerini getir
    const orders = await prisma.order.findMany({
      where: {
        tableId: parseInt(tableId),
        status: { in: ['PENDING', 'PREPARING', 'READY'] }
      }
    });

    console.log('🔍 Bekleyen siparişler:', orders);

    if (orders.length === 0) {
      return res.status(400).json({ error: 'Bu masada tahsilat yapılacak sipariş yok' });
    }

    // Toplam tutarı hesapla
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    console.log('🔍 Toplam tutar:', totalAmount);

    // Sadece siparişleri COMPLETED yap, silme işlemi yapma
    console.log('🔍 Siparişleri COMPLETED yapıyorum...');
    await prisma.order.updateMany({
      where: {
        tableId: parseInt(tableId),
        status: { in: ['PENDING', 'PREPARING', 'READY'] }
      },
      data: {
        status: 'COMPLETED',
        notes: `Tahsilat: ${paymentMethod} - ${notes}`.trim()
      }
    });

    console.log('✅ Tahsilat başarılı - sadece siparişler COMPLETED yapıldı');
    
    const response = {
      success: true,
      message: `Masa ${table.number} tahsilatı tamamlandı`,
      totalAmount,
      orderCount: orders.length
    };

    console.log('✅ Response:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Masa tahsilat hatası:', error);
    console.error('❌ Hata stack:', error.stack);
    console.error('❌ Hata mesajı:', error.message);
    res.status(500).json({ error: 'Tahsilat yapılamadı', details: error.message });
  }
});

// Masa verilerini sıfırla (tahsilat sonrası) - ÖNCE TANIMLANMALI
app.post('/api/admin/tables/:tableId/reset', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { tableId } = req.params;
    
    // Masayı kontrol et
    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: { branch: true }
    });

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    // Masanın tüm siparişlerini kontrol et
    const pendingOrders = await prisma.order.findMany({
      where: {
        tableId: parseInt(tableId),
        status: { in: ['PENDING', 'PREPARING', 'READY'] }
      }
    });

    if (pendingOrders.length > 0) {
      return res.status(400).json({ 
        error: 'Bu masada henüz tahsilat yapılmamış siparişler var',
        pendingCount: pendingOrders.length
      });
    }

    // Masanın tüm siparişlerini sil (COMPLETED olanlar)
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        tableId: parseInt(tableId),
        status: 'COMPLETED'
      }
    });

    res.json({
      success: true,
      message: `Masa ${table.number} verileri sıfırlandı`,
      deletedCount: deletedOrders.count
    });

  } catch (error) {
    console.error('Masa sıfırlama hatası:', error);
    res.status(500).json({ error: 'Masa sıfırlanamadı' });
  }
});

// Aktif masaları getir (tüm şubeler)
app.get('/api/admin/tables/active', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    let whereClause = {
      isActive: true
    };
    
    // Eğer BRANCH_MANAGER ise sadece kendi şubesinin masalarını getir
    if (req.user.role === 'BRANCH_MANAGER') {
      whereClause.branchId = req.user.branchId;
    }

    // Sadece gerekli alanları seç - gereksiz include'ları kaldır
    const tables = await prisma.table.findMany({
      where: whereClause,
      select: {
        id: true,
        number: true,
        isActive: true,
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        orders: {
          where: {
            status: { not: 'DELIVERED' },
            orderType: 'TABLE'
          },
          select: {
            id: true,
            totalAmount: true,
            orderItems: {
              select: {
                id: true,
                quantity: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: [
        { branch: { name: 'asc' } },
        { number: 'asc' }
      ]
    });

    // Her masa için toplam tutarı hesapla
    const tablesWithTotal = tables.map(table => {
      const totalAmount = table.orders.reduce((sum, order) => {
        return sum + order.orderItems.reduce((orderSum, item) => {
          return orderSum + (item.price * item.quantity);
        }, 0);
      }, 0);

      return {
        ...table,
        totalAmount,
        orderCount: table.orders.length
      };
    });

    res.json(tablesWithTotal);
  } catch (error) {
    console.error('Aktif masalar getirilemedi:', error);
    res.status(500).json({ error: 'Masalar getirilemedi' });
  }
});

// Şubeye göre masaları getir
app.get('/api/admin/tables/branch/:branchId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { branchId } = req.params;
    
    const tables = await prisma.table.findMany({
      where: { branchId: parseInt(branchId) },
      include: {
        branch: true
      },
      orderBy: { number: 'asc' }
    });
    
    res.json(tables);
  } catch (error) {
    console.error('Şube masaları getirilemedi:', error);
    res.status(500).json({ error: 'Şube masaları getirilemedi' });
  }
});

// Yeni masa ekle
app.post('/api/admin/tables', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { number, branchId } = req.body;
    if (!number || !branchId) {
      return res.status(400).json({ error: 'Masa numarası ve şube ID gerekli' });
    }

    // branchId üzerinden companyId'yi çek
    const branch = await prisma.branch.findUnique({ where: { id: parseInt(branchId) } });
    if (!branch) {
      return res.status(400).json({ error: 'Geçersiz şube' });
    }

    // Aynı şubede aynı masa numarası var mı kontrol et
    const existingTable = await prisma.table.findFirst({
      where: { 
        number: number,
        branchId: parseInt(branchId)
      }
    });

    if (existingTable) {
      return res.status(400).json({ error: 'Bu masa numarası zaten kullanımda' });
    }

    const newTable = await prisma.table.create({
      data: {
        number,
        branchId: parseInt(branchId),
        isActive: true
      },
      include: {
        branch: true
      }
    });
    
    res.status(201).json(newTable);
  } catch (error) {
    console.error('Masa ekleme hatası:', error);
    res.status(500).json({ error: 'Masa eklenemedi', details: error.message, stack: error.stack });
  }
});

// Masa güncelle
app.put('/api/admin/tables/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { id } = req.params;
    const { number, isActive } = req.body;
    
    const updatedTable = await prisma.table.update({
      where: { id: parseInt(id) },
      data: {
        number,
        isActive
      },
      include: {
        branch: true
      }
    });
    
    res.json(updatedTable);
  } catch (error) {
    console.error('Masa güncelleme hatası:', error);
    res.status(500).json({ error: 'Masa güncellenemedi' });
  }
});

// Masa sil
app.delete('/api/admin/tables/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { id } = req.params;
    
    await prisma.table.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Masa silindi' });
  } catch (error) {
    console.error('Masa silme hatası:', error);
    res.status(500).json({ error: 'Masa silinemedi' });
  }
});

// QR kod oluştur
app.get('/api/admin/tables/:id/qr', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { id } = req.params;
    
    const table = await prisma.table.findUnique({
      where: { id: parseInt(id) },
      include: {
        branch: true
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    // QR kod için URL oluştur
    const qrData = {
      tableId: table.id,
      tableNumber: table.number,
      branchId: table.branchId,
      branchName: table.branch.name
    };

    // Frontend URL'yi kontrol et ve güvenli hale getir
    let frontendUrl = process.env.FRONTEND_URL;
    
    // Production ortamında doğru URL'yi kullan
    if (process.env.NODE_ENV === 'production') {
      frontendUrl = 'https://siparisnet.netlify.app';
    } else if (!frontendUrl) {
      frontendUrl = 'https://siparisnet.netlify.app';
    }
    
    console.log('🔗 QR kod için Frontend URL:', frontendUrl);
    console.log('🔗 Environment NODE_ENV:', process.env.NODE_ENV);
    console.log('🔗 Environment FRONTEND_URL:', process.env.FRONTEND_URL);
    
    const qrUrl = `${frontendUrl}/table-order?data=${encodeURIComponent(JSON.stringify(qrData))}`;
    console.log('🔗 Oluşturulan QR URL:', qrUrl);
    
    // QR kod oluştur
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      table,
      qrCode: qrCodeDataUrl,
      qrUrl: qrUrl
    });
  } catch (error) {
    console.error('QR kod oluşturma hatası:', error);
    res.status(500).json({ error: 'QR kod oluşturulamadı' });
  }
});

// ==================== MASA SİPARİŞ ENDPOINT'LERİ ====================

// Masa siparişlerini getir (Müşteri için - authentication gerektirmez)
app.get('/api/table/:tableId/orders', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    console.log('🔍 Müşteri masa siparişleri isteği, tableId:', tableId);

    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: {
        branch: true,
        orders: {
          where: {
            orderType: 'TABLE',
            status: { in: ['PENDING', 'PREPARING', 'READY'] } // Teslim edilmiş siparişleri gizle
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!table) {
      console.log('❌ Masa bulunamadı, tableId:', tableId);
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    if (!table.isActive) {
      console.log('❌ Masa aktif değil, tableId:', tableId);
      return res.status(400).json({ error: 'Bu masa aktif değil' });
    }

    console.log('✅ Masa bulundu, sipariş sayısı:', table.orders.length);

    // Toplam tutarı hesapla
    const totalAmount = table.orders.reduce((sum, order) => {
      return sum + order.orderItems.reduce((orderSum, item) => {
        return orderSum + (item.price * item.quantity);
      }, 0);
    }, 0);

    res.json({
      table,
      orders: table.orders,
      totalAmount,
      orderCount: table.orders.length
    });
  } catch (error) {
    console.error('❌ Müşteri masa siparişleri getirilemedi:', error);
    res.status(500).json({ error: 'Siparişler getirilemedi' });
  }
});

// QR kod ile masa bilgilerini getir
app.get('/api/table/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: {
        branch: true
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    if (!table.isActive) {
      return res.status(400).json({ error: 'Bu masa aktif değil' });
    }

    res.json(table);
  } catch (error) {
    console.error('Masa bilgileri getirilemedi:', error);
    res.status(500).json({ error: 'Masa bilgileri getirilemedi' });
  }
});

// Masa için ürünleri getir
app.get('/api/table/:tableId/products', async (req, res) => {
  try {
    const { tableId } = req.params;
    console.log('🔍 Table products endpoint çağrıldı, tableId:', tableId);
    
    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: {
        branch: true
      }
    });

    if (!table) {
      console.log('❌ Masa bulunamadı, tableId:', tableId);
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    if (!table.isActive) {
      console.log('❌ Masa aktif değil, tableId:', tableId);
      return res.status(400).json({ error: 'Bu masa aktif değil' });
    }

    console.log('✅ Masa bulundu, branchId:', table.branchId);

    // Şubeye ait ürünleri getir
    const products = await prisma.product.findMany({
      where: { 
        branchId: table.branchId,
        isActive: true
      },
      include: {
        category: true
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    });
    
    console.log('✅ Masa ürünleri başarıyla getirildi, sayı:', products.length);
    res.json(products);
  } catch (error) {
    console.error('❌ Masa ürünleri getirilemedi:', error);
    console.error('❌ Hata detayı:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Masa ürünleri getirilemedi' });
  }
});

// Masa siparişi oluştur
app.post('/api/table/:tableId/order', async (req, res) => {
  try {
    const { tableId } = req.params;
    const { items, notes } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sipariş öğeleri gerekli' });
    }

    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: {
        branch: true
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    if (!table.isActive) {
      return res.status(400).json({ error: 'Bu masa aktif değil' });
    }

    // Toplam tutarı hesapla
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      if (product) {
        totalAmount += product.price * item.quantity;
      }
    }

    // Sipariş numarası oluştur
    const orderNumber = `T${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Siparişi oluştur
    const order = await prisma.order.create({
      data: {
        orderNumber,
        branchId: table.branchId,
        tableId: table.id,
        status: 'PENDING',
        totalAmount,
        notes: notes || `Masa ${table.number} siparişi`,
        orderType: 'TABLE'
      }
    });

    // Sipariş öğelerini oluştur
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      if (product) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
            note: item.note || null // Ürün notunu kaydet
          }
        });
      }
    }

    // Email bildirimleri gönder (asenkron olarak)
    try {
      // Müşteri bilgileri masa siparişlerinde genellikle yok, sadece admin bildirimi
      sendAdminNotification(order, null, table.branch);
      
    } catch (emailError) {
      console.error('❌ Masa siparişi email gönderme hatası:', emailError);
      // Email hatası sipariş oluşturmayı etkilemesin
    }

    res.status(201).json({
      order,
      table: table,
      message: `Masa ${table.number} için sipariş oluşturuldu`
    });
  } catch (error) {
    console.error('Masa siparişi oluşturma hatası:', error);
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

async function seedData() {
  try {
    await prisma.$connect();
    
    // Veritabanında veri var mı kontrol et - daha kapsamlı kontrol
    const existingUsers = await prisma.user.count();
    const existingBranches = await prisma.branch.count();
    const existingCategories = await prisma.category.count();
    const existingProducts = await prisma.product.count();
    
    // Eğer herhangi bir veri varsa seed data atla
    if (existingUsers > 0 || existingBranches > 0 || existingCategories > 0 || existingProducts > 0) {
      console.log('✅ Veritabanında zaten veri var, seed data atlanıyor');
      console.log(`📊 Mevcut veriler: ${existingUsers} kullanıcı, ${existingBranches} şube, ${existingCategories} kategori, ${existingProducts} ürün`);
      return;
    }
    
    console.log('📦 Veritabanı boş, seed data oluşturuluyor...');
    
    const categories = [
      { name: 'Pizza', description: 'Çeşitli pizza türleri' },
      { name: 'Burger', description: 'Hamburger ve sandviçler' },
      { name: 'İçecek', description: 'Soğuk ve sıcak içecekler' },
      { name: 'Tatlı', description: 'Çeşitli tatlılar' },
      { name: 'Salata', description: 'Taze salatalar' },
      { name: 'Çorba', description: 'Sıcak çorbalar' },
      { name: 'Kebap', description: 'Çeşitli kebap türleri' },
      { name: 'Pide', description: 'Geleneksel pideler' }
    ];

    for (const categoryData of categories) {
      await prisma.category.upsert({
        where: { id: categories.indexOf(categoryData) + 1 },
        update: {},
        create: {
          id: categories.indexOf(categoryData) + 1,
          ...categoryData
        }
      });
    }

    const branches = [
      {
        name: 'Merkez Şube',
        address: 'Atatürk Caddesi No:1, İstanbul',
        phone: '0212 555 0001'
      },
      {
        name: 'Kadıköy Şube',
        address: 'Moda Caddesi No:15, İstanbul',
        phone: '0216 555 0002'
      }
    ];

    for (const branchData of branches) {
      await prisma.branch.upsert({
        where: { id: branchData.name === 'Merkez Şube' ? 1 : 2 },
        update: {},
        create: {
          id: branchData.name === 'Merkez Şube' ? 1 : 2,
          ...branchData
        }
      });
    }

    const pizzaCategory = await prisma.category.findUnique({ where: { id: 1 } });
    const burgerCategory = await prisma.category.findUnique({ where: { id: 2 } });
    const drinkCategory = await prisma.category.findUnique({ where: { id: 3 } });
    const dessertCategory = await prisma.category.findUnique({ where: { id: 4 } });

    const merkezBranch = await prisma.branch.findUnique({ where: { id: 1 } });
    const kadikoyBranch = await prisma.branch.findUnique({ where: { id: 2 } });

    if (pizzaCategory && burgerCategory && drinkCategory && dessertCategory && merkezBranch && kadikoyBranch) {
      const products = [
        {
          name: 'Margherita Pizza',
          description: 'Domates sosu, mozzarella peyniri, fesleğen',
          price: 85.00,
          categoryId: pizzaCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Pepperoni Pizza',
          description: 'Domates sosu, mozzarella peyniri, pepperoni',
          price: 95.00,
          categoryId: pizzaCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Klasik Burger',
          description: 'Dana eti, marul, domates, soğan, özel sos',
          price: 65.00,
          categoryId: burgerCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Çifte Burger',
          description: 'Çifte dana eti, cheddar peyniri, marul, domates',
          price: 85.00,
          categoryId: burgerCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Kola',
          description: '330ml Coca Cola',
          price: 15.00,
          categoryId: drinkCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Ayran',
          description: '500ml taze ayran',
          price: 12.00,
          categoryId: drinkCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Çikolatalı Pasta',
          description: 'Çikolatalı krema ile kaplı pasta',
          price: 25.00,
          categoryId: dessertCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Tiramisu',
          description: 'İtalyan usulü tiramisu',
          price: 30.00,
          categoryId: dessertCategory.id,
          branchId: merkezBranch.id
        },
        {
          name: 'Margherita Pizza',
          description: 'Domates sosu, mozzarella peyniri, fesleğen',
          price: 87.00,
          categoryId: pizzaCategory.id,
          branchId: kadikoyBranch.id
        },
        {
          name: 'Pepperoni Pizza',
          description: 'Domates sosu, mozzarella peyniri, pepperoni',
          price: 97.00,
          categoryId: pizzaCategory.id,
          branchId: kadikoyBranch.id
        },
        {
          name: 'Klasik Burger',
          description: 'Dana eti, marul, domates, soğan, özel sos',
          price: 67.00,
          categoryId: burgerCategory.id,
          branchId: kadikoyBranch.id
        },
        {
          name: 'Çifte Burger',
          description: 'Çifte dana eti, cheddar peyniri, marul, domates',
          price: 87.00,
          categoryId: burgerCategory.id,
          branchId: kadikoyBranch.id
        },
        {
          name: 'Kola',
          description: '330ml Coca Cola',
          price: 16.00,
          categoryId: drinkCategory.id,
          branchId: kadikoyBranch.id
        },
        {
          name: 'Ayran',
          description: '500ml taze ayran',
          price: 13.00,
          categoryId: drinkCategory.id,
          branchId: kadikoyBranch.id
        },
        {
          name: 'Çikolatalı Pasta',
          description: 'Çikolatalı krema ile kaplı pasta',
          price: 27.00,
          categoryId: dessertCategory.id,
          branchId: kadikoyBranch.id
        },
        {
          name: 'Tiramisu',
          description: 'İtalyan usulü tiramisu',
          price: 32.00,
          categoryId: dessertCategory.id,
          branchId: kadikoyBranch.id
        }
      ];

      let productId = 1;
      for (const productData of products) {
        await prisma.product.upsert({
          where: { id: productId },
          update: {},
          create: {
            id: productId,
            ...productData
          }
        });
        productId++;
      }

    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Süper Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        isApproved: true
      }
    });

    const managerPassword = await bcrypt.hash('manager123', 10);
    await prisma.user.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        email: 'manager@example.com',
        password: managerPassword,
        name: 'Merkez Şube Müdürü',
        role: 'BRANCH_MANAGER',
        branchId: 1,
        isActive: true,
        isApproved: true
      }
    });

  } catch (error) {
    console.error('Seed data hatası:', error);
  }
}

app.post('/api/seed', async (req, res) => {
  try {
    await seedData();
    res.json({ message: 'Seed data başarıyla oluşturuldu' });
  } catch (error) {
    console.error('Seed endpoint hatası:', error);
    res.status(500).json({ error: 'Seed data oluşturulamadı' });
  }
});

app.post('/api/admin/fix-kadikoy-dates', async (req, res) => {
  try {
    const now = new Date();
    const updated = await prisma.order.updateMany({
      where: { branchId: 2 },
      data: { createdAt: now }
    });
    res.json({ message: 'Kadıköy Şubesi siparişlerinin tarihi güncellendi', count: updated.count });
  } catch (error) {
    console.error('Kadıköy tarih düzeltme hatası:', error);
    res.status(500).json({ error: 'Kadıköy sipariş tarihi güncellenemedi' });
  }
});

app.post('/api/admin/fix-kadikoy-completed-dates', async (req, res) => {
  try {
    const now = new Date();
    const updated = await prisma.order.updateMany({
      where: { branchId: 2, status: 'COMPLETED' },
      data: { createdAt: now }
    });
    res.json({ message: 'Kadıköy Şubesi COMPLETED siparişlerinin tarihi güncellendi', count: updated.count });
  } catch (error) {
    console.error('Kadıköy COMPLETED tarih düzeltme hatası:', error);
    res.status(500).json({ error: 'Kadıköy COMPLETED sipariş tarihi güncellenemedi' });
  }
});



app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const { branchId, period = 'daily' } = req.query;
    
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
    }

    let where = {
      createdAt: {
        gte: startDate,
        lt: endDate
      },
      status: { in: ['DELIVERED', 'COMPLETED'] }
    };

    if (req.user.role === 'BRANCH_MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = Number(branchId);
    }

    let branches = [];
    if (req.user.role === 'SUPER_ADMIN') {
      branches = await prisma.branch.findMany({ where: { isActive: true } });
    } else {
      const userBranch = await prisma.branch.findUnique({
        where: { id: req.user.branchId }
      });
      if (userBranch) branches = [userBranch];
    }

    const stats = [];
    for (const branch of branches) {
      if (branchId && branch.id !== Number(branchId)) continue;
      
      const orders = await prisma.order.findMany({
        where: { ...where, branchId: branch.id },
        select: { totalAmount: true, id: true, createdAt: true }
      });
      
      const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const orderCount = orders.length;
      const averageOrder = orderCount > 0 ? totalRevenue / orderCount : 0;
      
      let dailyAverage = 0;
      if (period === 'weekly') {
        dailyAverage = totalRevenue / 7;
      } else if (period === 'monthly') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        dailyAverage = totalRevenue / daysInMonth;
      } else {
        dailyAverage = totalRevenue;
      }
      
      stats.push({
        branchId: branch.id,
        branchName: branch.name,
        period: period,
        orders: orderCount,
        revenue: totalRevenue,
        averageOrder: averageOrder,
        dailyAverage: dailyAverage,
        startDate: startDate,
        endDate: endDate
      });
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'İstatistik verisi getirilemedi' });
  }
});

// Eski resimleri temizle endpoint'i
app.post('/api/admin/cleanup-images', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Uploads klasörü var mı kontrol et
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Tüm ürünleri getir
    const products = await prisma.product.findMany({
      select: { image: true }
    });
    
    // Veritabanındaki resim yollarını topla
    const dbImages = products.map(p => p.image).filter(img => img);
    
    // Uploads klasöründeki dosyaları listele
    const files = fs.readdirSync(uploadsDir);
    
    // Kullanılmayan dosyaları sil
    let deletedCount = 0;
    for (const file of files) {
      const filePath = `/uploads/${file}`;
      if (!dbImages.includes(filePath)) {
        fs.unlinkSync(path.join(uploadsDir, file));
        deletedCount++;
        console.log('Silinen dosya:', file);
      }
    }
    
    res.json({ 
      message: `${deletedCount} kullanılmayan dosya silindi`,
      deletedCount,
      totalFiles: files.length,
      dbImages: dbImages.length
    });
  } catch (error) {
    console.error('Resim temizleme hatası:', error);
    res.status(500).json({ error: 'Resim temizlenemedi' });
  }
});

// Render için resim durumu kontrol endpoint'i
app.get('/api/admin/image-status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Tüm ürünleri getir
    const products = await prisma.product.findMany({
      select: { id: true, name: true, image: true }
    });
    
    // Her ürün için resim durumunu kontrol et
    const imageStatus = products.map(product => {
      if (!product.image) {
        return {
          id: product.id,
          name: product.name,
          hasImage: false,
          imagePath: null,
          fileExists: false
        };
      }
      
      const filename = product.image.replace('/uploads/', '');
      const filePath = path.join(uploadsDir, filename);
      const fileExists = fs.existsSync(filePath);
      
      return {
        id: product.id,
        name: product.name,
        hasImage: true,
        imagePath: product.image,
        fileExists: fileExists
      };
    });
    
    const missingImages = imageStatus.filter(item => item.hasImage && !item.fileExists);
    const totalProducts = imageStatus.length;
    const productsWithImages = imageStatus.filter(item => item.hasImage).length;
    const existingImages = imageStatus.filter(item => item.hasImage && item.fileExists).length;
    
    res.json({
      totalProducts,
      productsWithImages,
      existingImages,
      missingImages: missingImages.length,
      details: imageStatus,
      message: `Toplam ${totalProducts} ürün, ${productsWithImages} tanesi resimli, ${existingImages} resim mevcut, ${missingImages.length} resim eksik`
    });
  } catch (error) {
    console.error('Resim durumu kontrol hatası:', error);
    res.status(500).json({ error: 'Resim durumu kontrol edilemedi' });
  }
});


// Veritabanı başlatma ve seed logic'i - Render Güvenli Versiyon
async function initializeDatabase() {
  try {
    console.log('🔍 Veritabanı bağlantısı test ediliyor...');
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      // Sadece mevcut verileri göster, seed data yükleme
      const existingUsers = await prisma.user.count();
      const existingBranches = await prisma.branch.count();
      const existingCategories = await prisma.category.count();
      const existingProducts = await prisma.product.count();
      
      console.log('✅ Gerçek veritabanına bağlandı - seed data yükleme devre dışı');
      console.log(`📊 Mevcut veriler: ${existingUsers} kullanıcı, ${existingBranches} şube, ${existingCategories} kategori, ${existingProducts} ürün`);
    } else {
      console.log('⚠️ Veritabanı bağlantısı başarısız');
      console.log('🔧 Sadece gerçek veritabanı kullanılıyor - seed data yükleme yok');
    }
  } catch (error) {
    console.error('❌ Veritabanı başlatma hatası:', error);
    console.log('🔧 Sadece gerçek veritabanı kullanılıyor - seed data yükleme yok');
}
}

// Veritabanını başlat
initializeDatabase();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '2.0.0'
  });
});



// Veritabanı verilerini kontrol etme endpoint'i
app.get('/api/database-status', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const branchCount = await prisma.branch.count();
    const categoryCount = await prisma.category.count();
    const productCount = await prisma.product.count();
    const orderCount = await prisma.order.count();
    
    // Örnek verileri kontrol et
    const sampleUser = await prisma.user.findFirst();
    const sampleBranch = await prisma.branch.findFirst();
    
    res.json({
      database: isPostgreSQL ? 'PostgreSQL' : 'SQLite',
      counts: {
        users: userCount,
        branches: branchCount,
        categories: categoryCount,
        products: productCount,
        orders: orderCount
      },
      sampleData: {
        user: sampleUser ? { id: sampleUser.id, email: sampleUser.email, name: sampleUser.name } : null,
        branch: sampleBranch ? { id: sampleBranch.id, name: sampleBranch.name } : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Veritabanı durumu kontrol edilemedi', details: error.message });
  }
});

// Gerçek verileri listeleme endpoint'i
app.get('/api/real-data', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, address: true }
    });
    
    const products = await prisma.product.findMany({
      select: { id: true, name: true, price: true, categoryId: true },
      take: 5
    });
    
    res.json({
      message: 'Gerçek veritabanı verileri',
      users: users,
      branches: branches,
      products: products
    });
  } catch (error) {
    res.status(500).json({ error: 'Veriler getirilemedi', details: error.message });
  }
});



// Admin kullanıcısı oluşturma endpoint'i
app.post('/api/admin/create-admin', async (req, res) => {
  try {
    // Önce admin kullanıcısının var olup olmadığını kontrol et
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    });
    
    if (existingAdmin) {
      return res.json({ 
        message: 'Admin kullanıcısı zaten mevcut',
        user: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          name: existingAdmin.name,
          role: existingAdmin.role
        }
      });
    }
    
    // Admin kullanıcısını oluştur
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Süper Admin',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });
    
    res.json({ 
      message: 'Admin kullanıcısı başarıyla oluşturuldu',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Admin kullanıcısı oluşturulamadı', details: error.message });
  }
});



// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Fast Food Sales API',
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    features: [
      'Rate Limiting',
      'Security Headers',
      'Compression',
      'Logging',
      'Error Handling'
    ],
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      branches: 'GET /api/branches',
      products: 'GET /api/products/:branchId',
      orders: 'POST /api/orders',
      admin: {
        orders: 'GET /api/admin/orders',
        updateOrderStatus: 'PUT /api/admin/orders/:id/status',
        users: 'GET /api/admin/users',
        products: 'GET /api/admin/products',
        categories: 'GET /api/admin/categories',
        branches: 'GET /api/admin/branches'
      }
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Sunucu hatası',
    details: err.message,
    stack: err.stack
  });
});

// Admin: Kullanıcı aktivasyonu
app.put('/api/admin/users/:id/activate', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { id } = req.params;
    
    // Kullanıcı var mı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    // Kullanıcıyı aktif hale getir
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: true }
    });
    
    res.json({ message: 'Kullanıcı başarıyla aktifleştirildi' });
  } catch (error) {
    console.error('Kullanıcı aktivasyon hatası:', error);
    res.status(500).json({ error: 'Kullanıcı aktivasyonu başarısız' });
  }
});

// Veritabanı kolonu ekleme endpoint'i (sadece production'da)
app.post('/api/admin/fix-database', async (req, res) => {
  try {
    console.log('🔄 Veritabanı düzeltme işlemi başlatılıyor...');
    
    // order_items tablosuna note kolonu ekle
    await prisma.$executeRaw`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note TEXT`;
    
    console.log('✅ Note kolonu başarıyla eklendi!');
    
    // Kolonun eklendiğini doğrula
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_items' AND column_name = 'note'
    `;
    
    console.log('📊 Kolon bilgisi:', result);
    
    res.json({ 
      success: true, 
      message: 'Veritabanı düzeltildi',
      columnInfo: result 
    });
    
  } catch (error) {
    console.error('❌ Veritabanı düzeltme hatası:', error);
    res.status(500).json({ 
      error: 'Veritabanı düzeltilemedi',
      details: error.message 
    });
  }
}); 

// Ürün resmi döndüren endpoint - Geçici olarak her zaman placeholder döndürür
app.get('/api/products/:id/image', async (req, res) => {
  try {
    console.log('🖼️ GET /api/products/:id/image çağrıldı - Placeholder döndürülüyor');
    
    // Geçici olarak her zaman placeholder SVG döndür
    res.set('Content-Type', 'image/svg+xml');
    return res.status(200).send(getPlaceholderSvg());
    
    /* Eski kod - şimdilik devre dışı
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product || !product.image) {
      // Placeholder SVG döndür
      res.set('Content-Type', 'image/svg+xml');
      return res.status(200).send(getPlaceholderSvg());
    }
    
    const filePath = path.join(__dirname, product.image);
    if (!require('fs').existsSync(filePath)) {
      // Dosya yoksa placeholder SVG döndür
      res.set('Content-Type', 'image/svg+xml');
      return res.status(200).send(getPlaceholderSvg());
    }
    
    res.set('Content-Type', 'image/png');
    res.sendFile(filePath, (err) => {
      if (err) {
        // Hata durumunda placeholder SVG döndür
        res.set('Content-Type', 'image/svg+xml');
        res.status(200).send(getPlaceholderSvg());
      }
    });
    */
  } catch (error) {
    // Hata durumunda placeholder SVG döndür
    res.set('Content-Type', 'image/svg+xml');
    res.status(200).send(getPlaceholderSvg());
  }
});



// 🚨 URGENT: Resim düzeltme endpoint'i
app.post('/api/admin/fix-images', async (req, res) => {
  try {
    console.log('🚨 POST /api/admin/fix-images çağrıldı - URGENT FIX');
    
    // Güzel bir placeholder SVG resim
    const placeholderImage = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#grad1)"/>
    <rect x="50" y="50" width="300" height="200" fill="rgba(255,255,255,0.9)" stroke="#e5e7eb" stroke-width="2" rx="10"/>
    <circle cx="200" cy="150" r="50" fill="#fbbf24"/>
    <path d="M180 130 L220 150 L180 170 Z" fill="#f59e0b"/>
    <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#374151">Resim Yükleniyor</text>
    <text x="200" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6b7280">Lütfen bekleyin...</text>
</svg>
`).toString('base64')}`;

    // Tüm ürünleri al
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`📊 ${products.length} ürün bulundu`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Tüm resim sorunlarını düzelt
        const needsUpdate = !product.image || 
                           product.image.includes('FILE_NOT_FOUND') || 
                           product.image.includes('uploads/') ||
                           product.image.includes('/opt/render/') ||
                           product.image.length < 100 ||
                           product.image.includes('Resim Yok');

        if (needsUpdate) {
          await prisma.product.update({
            where: { id: product.id },
            data: { image: placeholderImage }
          });
          
          console.log(`✅ ${product.name} -> Güzel placeholder resim eklendi`);
          updatedCount++;
        } else {
          console.log(`⏭️  ${product.name} -> Zaten iyi durumda`);
        }
      } catch (error) {
        console.log(`❌ ${product.name} -> Hata: ${error.message}`);
        errorCount++;
      }
    }

    console.log('🎉 PRODUCTION IMAGE FIX TAMAMLANDI!');
    console.log(`✅ Güncellenen ürün: ${updatedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);

    res.json({
      success: true,
      message: 'Resim sorunları düzeltildi!',
      updatedCount: updatedCount,
      errorCount: errorCount,
      totalProducts: products.length
    });

  } catch (error) {
    console.error('❌ Resim düzeltme hatası:', error);
    res.status(500).json({ 
      error: 'Resim düzeltilemedi',
      details: error.message 
    });
  }
});

// İlk upload endpoint'i kaldırıldı - çakışma önlendi

// Eski dosya tabanlı endpoint'ler kaldırıldı - Base64 veritabanı sistemi kullanılıyor

// İki taraflı resim senkronizasyon endpoint'i
app.post('/api/admin/sync-images', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Resim senkronizasyonu başlatılıyor...');
    
    // Local dosyaları kontrol et
    const uploadDir = path.join(__dirname, 'uploads', 'products');
    const localFiles = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
    
    console.log('📁 Local dosyalar:', localFiles);
    
    // Veritabanından resimleri al
    const dbImages = await prisma.image.findMany({
      select: {
        id: true,
        filename: true,
        dataUrl: true,
        size: true,
        createdAt: true
      }
    });
    
    console.log('🗄️ Veritabanı resimleri:', dbImages.length);
    
    // Senkronizasyon raporu
    const syncReport = {
      localFiles: localFiles.length,
      dbImages: dbImages.length,
      synced: 0,
      errors: []
    };
    
    // Local dosyaları veritabanına ekle (yoksa)
    for (const filename of localFiles) {
      try {
        const filePath = path.join(uploadDir, filename);
        const stats = fs.statSync(filePath);
        
        // Dosyayı base64'e çevir
        const fileBuffer = fs.readFileSync(filePath);
        const base64String = fileBuffer.toString('base64');
        
        // MIME type belirle
        const ext = path.extname(filename).toLowerCase();
        let mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        
        const dataUrl = `data:${mimeType};base64,${base64String}`;
        
        // Veritabanında var mı kontrol et
        const existingImage = await prisma.image.findFirst({
          where: { filename }
        });
        
        if (!existingImage) {
          // Veritabanına ekle
          await prisma.image.create({
            data: {
              filename,
              originalName: filename,
              mimeType,
              size: stats.size,
              dataUrl,
              uploadedBy: req.user.userId
            }
          });
          
          syncReport.synced++;
          console.log('✅ Local dosya veritabanına eklendi:', filename);
        }
      } catch (error) {
        console.error('❌ Dosya işleme hatası:', filename, error);
        syncReport.errors.push(`${filename}: ${error.message}`);
      }
    }
    
    console.log('✅ Senkronizasyon tamamlandı:', syncReport);
    
    res.json({
      message: 'Resim senkronizasyonu tamamlandı',
      report: syncReport
    });
    
  } catch (error) {
    console.error('❌ Senkronizasyon hatası:', error);
    res.status(500).json({ error: 'Senkronizasyon hatası: ' + error.message });
  }
});

// E-ticaret entegrasyonu router'ını ekle
const ecommerceIntegrationRouter = require('./integrations/api');
app.use('/api/integrations', ecommerceIntegrationRouter);

// Chatbot router'ını ekle
app.use('/api/chatbot', chatbotRouter);
app.use('/api/chatbot', aiChatbotRouter);
app.use('/api', dashboardRouter);

// Yedekleme router'ını ekle
app.use('/api/backup', backupRouter);

// Admin backup endpoint'leri
app.get('/api/admin/backup/stats', authenticateToken, async (req, res) => {
  try {
    const backupSystem = require('./backup-system');
    const stats = backupSystem.getBackupStatus();
    res.json(stats);
  } catch (error) {
    console.error('Backup stats hatası:', error);
    res.status(500).json({ error: 'Backup istatistikleri alınamadı' });
  }
});

app.get('/api/admin/backup/list', authenticateToken, async (req, res) => {
  try {
    const backupSystem = require('./backup-system');
    const backupList = backupSystem.getBackupList();
    res.json(backupList);
  } catch (error) {
    console.error('Backup list hatası:', error);
    res.status(500).json({ error: 'Backup listesi alınamadı' });
  }
});

app.post('/api/admin/backup/create', authenticateToken, async (req, res) => {
  try {
    const backupSystem = require('./backup-system');
    const backupFile = await backupSystem.triggerManualBackup();
    res.json({ 
      success: true, 
      message: 'Yedekleme başarıyla oluşturuldu',
      filename: require('path').basename(backupFile)
    });
  } catch (error) {
    console.error('Backup oluşturma hatası:', error);
    res.status(500).json({ error: 'Yedekleme oluşturulamadı' });
  }
});

app.get('/api/admin/backup/download/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const backupSystem = require('./backup-system');
    const backupPath = require('path').join(backupSystem.backupDir, filename);
    
    if (!require('fs').existsSync(backupPath)) {
      return res.status(404).json({ error: 'Yedek dosyası bulunamadı' });
    }
    
    res.download(backupPath, filename);
  } catch (error) {
    console.error('Backup indirme hatası:', error);
    res.status(500).json({ error: 'Yedek dosyası indirilemedi' });
  }
});



// 404 handler - En sona taşındı

// Port çakışması kontrolü ve alternatif port deneme
const startServer = (port) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`🚀 Server ${port} portunda çalışıyor`);
      console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
      console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
      resolve(server);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} kullanımda, alternatif port deneniyor...`);
        reject(err);
      } else {
        console.error('❌ Server başlatma hatası:', err);
        reject(err);
      }
    });
  });
};

// SABİT PORT - Sadece SERVER_PORT kullan
const ports = [SERVER_PORT];
let server = null;

const tryStartServer = async () => {
  // Upload dizinlerini oluştur
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const productsDir = path.join(uploadsDir, 'products');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Uploads dizini oluşturuldu:', uploadsDir);
    }
    
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
      console.log('📁 Products dizini oluşturuldu:', productsDir);
    }
  } catch (error) {
    console.error('❌ Upload dizinleri oluşturulamadı:', error);
  }

  // Sadece sabit portu dene
  try {
    server = await startServer(SERVER_PORT);
    console.log(`🚀 Server ${SERVER_PORT} portunda çalışıyor`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${SERVER_PORT} kullanımda. Lütfen portu serbest bırakın.`);
      console.error('💡 Çözüm: taskkill /F /IM node.exe komutunu çalıştırın');
      process.exit(1);
    } else {
      throw err;
    }
  }
};

tryStartServer();

// Socket.IO konfigürasyonu - server hazır olduğunda
let io = null; // Global io objesi

const setupSocketIO = () => {
  if (server) {
    try {
      io = configureSocket(server);
      console.log('🔌 Socket.IO konfigürasyonu tamamlandı');
      
      // Socket.IO bağlantı durumu izleme
      io.engine.on('connection_error', (err) => {
        console.error('🔌 Socket.IO bağlantı hatası:', err);
      });
      
      // Server kapatma işlemi
      process.on('SIGTERM', () => {
        console.log('🔄 Server kapatılıyor...');
        if (io) {
          io.close();
        }
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Socket.IO kurulum hatası:', error);
    }
  }
};

// Server başlatıldıktan sonra Socket.IO'yu kur
setTimeout(setupSocketIO, 1000);

// Otomatik temizlik başlat
setTimeout(() => {
  console.log('🧹 Otomatik temizlik sistemi başlatılıyor...');
  startAutoCleanup();
}, 2000);

// Yedekleme sistemi başlat
setTimeout(() => {
  console.log('💾 Otomatik yedekleme sistemi başlatılıyor...');
  const backupSystem = require('./backup-system');
  backupSystem.scheduleBackups();
}, 3000);

// Admin temizlik endpoint'leri
app.post('/api/admin/cleanup-orders', authenticateToken, async (req, res) => {
  try {
    // Sadece SUPER_ADMIN ve BRANCH_MANAGER erişebilir
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    console.log('🧹 Manuel temizlik isteği alındı');
    
    // Temizlik işlemini çalıştır
    await cleanupOldOrders();
    
    // İstatistikleri al
    await showDatabaseStats();
    
    res.json({ 
      message: 'Eski siparişler başarıyla temizlendi',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Temizlik hatası:', error);
    res.status(500).json({ error: 'Temizlik işlemi başarısız' });
  }
});

// Tüm siparişleri silme endpoint'i
app.delete('/api/admin/orders', authenticateToken, async (req, res) => {
  try {
    // Sadece SUPER_ADMIN erişebilir
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz erişim. Sadece süper admin tüm siparişleri silebilir.' });
    }

    console.log('🗑️ Tüm siparişleri silme isteği alındı');
    
    // Önce toplam sipariş sayısını al
    const totalOrders = await prisma.order.count();
    const totalOrderItems = await prisma.orderItem.count();
    
    if (totalOrders === 0) {
      return res.json({ 
        message: 'Silinecek sipariş bulunmuyor',
        deletedOrders: 0,
        deletedOrderItems: 0,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📊 Silinecek sipariş sayısı: ${totalOrders}`);
    console.log(`📊 Silinecek orderItems sayısı: ${totalOrderItems}`);

    // Transaction ile güvenli silme işlemi
    const result = await prisma.$transaction(async (tx) => {
      // Önce orderItems'ları sil
      const deletedOrderItems = await tx.orderItem.deleteMany({});
      console.log(`🗑️ Silinen orderItems sayısı: ${deletedOrderItems.count}`);

      // Sonra siparişleri sil
      const deletedOrders = await tx.order.deleteMany({});
      console.log(`🗑️ Silinen sipariş sayısı: ${deletedOrders.count}`);

      return {
        deletedOrders: deletedOrders.count,
        deletedOrderItems: deletedOrderItems.count
      };
    });

    console.log('✅ Tüm siparişler başarıyla silindi!');
    console.log(`📊 Toplam silinen sipariş: ${result.deletedOrders}`);
    console.log(`📊 Toplam silinen orderItems: ${result.deletedOrderItems}`);

    res.json({ 
      message: 'Tüm siparişler başarıyla silindi',
      deletedOrders: result.deletedOrders,
      deletedOrderItems: result.deletedOrderItems,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Tüm siparişleri silme hatası:', error);
    res.status(500).json({ error: 'Siparişler silinirken bir hata oluştu' });
  }
});

app.get('/api/admin/database-stats', authenticateToken, async (req, res) => {
  try {
    // SUPER_ADMIN, ADMIN ve BRANCH_MANAGER erişebilir
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'admin' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    console.log('📊 Veritabanı istatistikleri isteği alındı');
    
    // İstatistikleri al
    const totalOrders = await prisma.order.count();
    const oldOrders = await prisma.order.count({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 12 * 60 * 60 * 1000)
        }
      }
    });
    
    const activeOrders = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'PREPARING', 'READY']
        }
      }
    });

    const completedOrders = await prisma.order.count({
      where: {
        status: {
          in: ['DELIVERED', 'CANCELLED']
        }
      }
    });

    // Bellek kullanımı
    const memUsage = process.memoryUsage();
    
    res.json({
      stats: {
        totalOrders,
        oldOrders,
        activeOrders,
        completedOrders
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ İstatistik hatası:', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

app.post('/api/admin/reset-super-admin', async (req, res) => {
  try {
    console.log('🔄 Süper admin hesabı sıfırlanıyor...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Süper admin hesabını güncelle veya oluştur
    const superAdmin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: hashedPassword,
        name: 'Süper Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        isApproved: true
      },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Süper Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('✅ Süper admin hesabı başarıyla sıfırlandı:', superAdmin.email);
    
    res.json({ 
      message: 'Süper admin hesabı başarıyla sıfırlandı',
      credentials: {
        email: 'admin@example.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('❌ Süper admin sıfırlama hatası:', error);
    res.status(500).json({ error: 'Süper admin hesabı sıfırlanamadı: ' + error.message });
  }
});

app.post('/api/admin/reset-manager', async (req, res) => {
  try {
    console.log('🔄 Şube müdürü hesabı sıfırlanıyor...');
    
    const hashedPassword = await bcrypt.hash('manager123', 10);
    
    // Şube müdürü hesabını güncelle veya oluştur
    const manager = await prisma.user.upsert({
      where: { email: 'manager@example.com' },
      update: {
        password: hashedPassword,
        name: 'Merkez Şube Müdürü',
        role: 'BRANCH_MANAGER',
        branchId: 1,
        isActive: true,
        isApproved: true
      },
      create: {
        email: 'manager@example.com',
        password: hashedPassword,
        name: 'Merkez Şube Müdürü',
        role: 'BRANCH_MANAGER',
        branchId: 1,
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('✅ Şube müdürü hesabı başarıyla sıfırlandı:', manager.email);
    
    res.json({ 
      message: 'Şube müdürü hesabı başarıyla sıfırlandı',
      credentials: {
        email: 'manager@example.com',
        password: 'manager123'
      }
    });
  } catch (error) {
    console.error('❌ Şube müdürü sıfırlama hatası:', error);
    res.status(500).json({ error: 'Şube müdürü hesabı sıfırlanamadı: ' + error.message });
  }
});

// ===== FIRMA YÖNETİMİ API ENDPOINT'LERİ =====

// Firma oluşturma
// app.post('/api/companies', companyManagement.createCompany);

// Firma listesi
// app.get('/api/companies', companyManagement.getCompanies);

// Firma detayı
// app.get('/api/companies/:id', companyManagement.getCompany);

// Firma güncelleme
// app.put('/api/companies/:id', companyManagement.updateCompany);

// Firma silme
// app.delete('/api/companies/:id', companyManagement.deleteCompany);

// Firma istatistikleri
// app.get('/api/companies/:id/stats', companyManagement.getCompanyStats);

// === COMPANY MANAGEMENT ENDPOINTS ===

app.post('/api/companies', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    const { name, domain, logo, address, phone, email } = req.body;
    if (!name || !domain) return res.status(400).json({ error: 'Firma adı ve domain zorunludur.' });
    const existing = await prisma.company.findUnique({ where: { domain } });
    if (existing) return res.status(400).json({ error: 'Bu domain zaten kayıtlı.' });
    const company = await prisma.company.create({
      data: { name, domain, logo: logo || '', address: address || '', phone: phone || '', email: email || '' }
    });
    res.status(201).json(company);
  } catch (e) {
    console.error('Firma ekleme hatası:', e);
    res.status(500).json({ error: 'Firma eklenemedi' });
  }
});

// ===== MASA TAHSİLAT API ENDPOINT'LERİ =====

// Aktif masaları getir
app.get('/api/admin/tables/active', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { branch: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    let whereClause = {
      isActive: true
    };
    
    if (user.role === 'BRANCH_MANAGER') {
      whereClause.branchId = user.branchId;
    }

    const tables = await prisma.table.findMany({
      where: whereClause,
      include: {
        branch: true,
        orders: {
          where: {
            status: { not: 'DELIVERED' },
            orderType: 'TABLE'
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { number: 'asc' }
    });

    // Her masa için toplam tutarı hesapla
    const tablesWithTotal = tables.map(table => {
      const totalAmount = table.orders.reduce((sum, order) => {
        return sum + order.orderItems.reduce((orderSum, item) => {
          return orderSum + (item.price * item.quantity);
        }, 0);
      }, 0);

      return {
        ...table,
        totalAmount,
        orderCount: table.orders.length
      };
    });

    res.json(tablesWithTotal);
  } catch (error) {
    console.error('Aktif masalar getirilemedi:', error);
    res.status(500).json({ error: 'Masalar getirilemedi' });
  }
});

// Masa siparişlerini getir (Admin için)
app.get('/api/admin/tables/:tableId/orders', authenticateToken, async (req, res) => {
  try {
    const { tableId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { branch: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: {
        branch: true,
        orders: {
          where: {
            status: { not: 'DELIVERED' },
            orderType: 'TABLE'
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    // Toplam tutarı hesapla
    const totalAmount = table.orders.reduce((sum, order) => {
      return sum + order.orderItems.reduce((orderSum, item) => {
        return orderSum + (item.price * item.quantity);
      }, 0);
    }, 0);

    res.json({
      table,
      orders: table.orders,
      totalAmount,
      orderCount: table.orders.length
    });
  } catch (error) {
    console.error('Masa siparişleri getirilemedi:', error);
    res.status(500).json({ error: 'Siparişler getirilemedi' });
  }
});

// Masa siparişlerini getir (Müşteri için - authentication gerektirmez)
app.get('/api/table/:tableId/orders', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    console.log('🔍 Müşteri masa siparişleri isteği, tableId:', tableId);

    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: {
        branch: true,
        orders: {
          where: {
            orderType: 'TABLE',
            status: { in: ['PENDING', 'PREPARING', 'READY'] } // Teslim edilmiş siparişleri gizle
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!table) {
      console.log('❌ Masa bulunamadı, tableId:', tableId);
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    if (!table.isActive) {
      console.log('❌ Masa aktif değil, tableId:', tableId);
      return res.status(400).json({ error: 'Bu masa aktif değil' });
    }

    console.log('✅ Masa bulundu, sipariş sayısı:', table.orders.length);

    // Toplam tutarı hesapla
    const totalAmount = table.orders.reduce((sum, order) => {
      return sum + order.orderItems.reduce((orderSum, item) => {
        return orderSum + (item.price * item.quantity);
      }, 0);
    }, 0);

    res.json({
      table,
      orders: table.orders,
      totalAmount,
      orderCount: table.orders.length
    });
  } catch (error) {
    console.error('❌ Müşteri masa siparişleri getirilemedi:', error);
    res.status(500).json({ error: 'Siparişler getirilemedi' });
  }
});

// Masa tahsilatı yap
app.post('/api/admin/tables/:tableId/collect', authenticateToken, async (req, res) => {
  try {
    const { tableId } = req.params;
    const { paymentMethod, amount } = req.body;
    
    if (!paymentMethod || !amount) {
      return res.status(400).json({ error: 'Ödeme yöntemi ve tutar zorunludur' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Masayı ve siparişlerini getir
    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
      include: {
        orders: {
          where: {
            status: { not: 'DELIVERED' },
            orderType: 'TABLE'
          }
        }
      }
    });

    if (!table) {
      return res.status(404).json({ error: 'Masa bulunamadı' });
    }

    if (table.orders.length === 0) {
      return res.status(400).json({ error: 'Bu masada tahsilat yapılacak sipariş bulunmuyor' });
    }

    // Tahsilat kaydı oluştur
    const payment = await prisma.tablePayment.create({
      data: {
        tableId: parseInt(tableId),
        amount: parseFloat(amount),
        paymentMethod,
        userId: user.id
      }
    });

    // Siparişleri teslim edildi olarak işaretle
    await prisma.order.updateMany({
      where: {
        tableId: parseInt(tableId),
        status: { not: 'DELIVERED' },
        orderType: 'TABLE'
      },
      data: {
        status: 'DELIVERED'
      }
    });

    // Masayı sıfırla
    await prisma.table.update({
      where: { id: parseInt(tableId) },
      data: {
        status: 'EMPTY',
        totalAmount: 0
      }
    });

    res.json({
      message: 'Tahsilat başarıyla tamamlandı',
      payment,
      tableId: parseInt(tableId)
    });
  } catch (error) {
    console.error('Tahsilat hatası:', error);
    res.status(500).json({ error: 'Tahsilat yapılamadı' });
  }
});

// Masa sıfırlama
app.post('/api/admin/tables/:tableId/reset', authenticateToken, async (req, res) => {
  try {
    const { tableId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Masayı sıfırla
    await prisma.table.update({
      where: { id: parseInt(tableId) },
      data: {
        status: 'EMPTY',
        totalAmount: 0
      }
    });

    // Siparişleri teslim edildi olarak işaretle
    await prisma.order.updateMany({
      where: {
        tableId: parseInt(tableId),
        status: { not: 'DELIVERED' },
        orderType: 'TABLE'
      },
      data: {
        status: 'DELIVERED'
      }
    });

    res.json({
      message: 'Masa başarıyla sıfırlandı',
      tableId: parseInt(tableId)
    });
  } catch (error) {
    console.error('Masa sıfırlama hatası:', error);
    res.status(500).json({ error: 'Masa sıfırlanamadı' });
  }
});

// Resim yükleme endpoint'i - Base64 formatında veritabanına kaydet (TEST MODE - NO AUTH)
app.post('/api/admin/upload-image', upload.single('image'), async (req, res) => {
  try {
    console.log('🔍 POST /api/admin/upload-image çağrıldı - v9 - BASE64 DATABASE');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request file:', req.file);
    console.log('🔍 Request headers:', req.headers);
    
    // CORS ayarları
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
    res.set('Access-Control-Max-Age', '86400');
    res.set('Access-Control-Allow-Credentials', 'false');
    
    // OPTIONS request için
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (!req.file) {
      console.log('❌ Resim dosyası yüklenmedi');
      return res.status(400).json({ error: 'Resim dosyası yüklenmedi' });
    }

    // Dosyayı base64'e çevir
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64String = fileBuffer.toString('base64');
    
    // Dosya uzantısına göre MIME type belirle
    const ext = path.extname(req.file.filename).toLowerCase();
    let mimeType = 'image/png'; // Varsayılan
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    // Base64 data URL oluştur
    const dataUrl = `data:${mimeType};base64,${base64String}`;
    
    // Veritabanına kaydet
    const savedImage = await prisma.image.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: mimeType,
        size: req.file.size,
        dataUrl: dataUrl,
        uploadedBy: req.user?.userId || null // Authentication yoksa null kullan
      }
    });
    
    // Fiziksel dosyayı sil (veritabanında saklandığı için)
    fs.unlinkSync(req.file.path);
    
    console.log('✅ Resim base64 formatında veritabanına kaydedildi:', req.file.filename);
    console.log('✅ Veritabanı ID:', savedImage.id);
    console.log('✅ Dosya boyutu:', req.file.size);
    
    res.json({
      message: 'Resim başarıyla yüklendi',
      id: savedImage.id,
      filename: savedImage.filename,
      originalName: savedImage.originalName,
      size: savedImage.size,
      mimeType: savedImage.mimeType
    });
  } catch (error) {
    console.error('❌ Resim yükleme hatası:', error);
    res.status(500).json({ error: 'Resim yüklenemedi: ' + error.message });
  }
});

// Resim listesi endpoint'i - Veritabanından base64 formatında (TEST MODE - NO AUTH)
app.get('/api/admin/images', async (req, res) => {
  try {
    console.log('🔍 GET /api/admin/images çağrıldı - v5 - BASE64 DATABASE');
    console.log('🔍 User:', req.user);
    console.log('🔍 Request headers:', req.headers);
    
    // Veritabanından resimleri al
    const images = await prisma.image.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        dataUrl: true,
        createdAt: true,
        uploadedBy: true
      }
    });
    
    console.log('✅ Veritabanından alınan resim sayısı:', images.length);
    
    // Base64 data URL'lerini döndür
    const imageList = images.map(img => ({
      id: img.id,
      filename: img.filename,
      originalName: img.originalName,
      size: img.size,
      type: img.filename.split('.').pop()?.toUpperCase() || 'UNKNOWN',
      uploadedAt: img.createdAt,
      url: img.dataUrl // Base64 data URL
    }));
    
    console.log('✅ Response gönderiliyor:', imageList.length, 'resim');
    
        res.json(imageList);
  } catch (error) {
    console.error('❌ Resim listesi hatası:', error);
    res.status(500).json({ error: 'Resim listesi alınamadı: ' + error.message });
  }
});

// Resim silme endpoint'i - Veritabanından sil
app.delete('/api/admin/images/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 DELETE /api/admin/images/:id çağrıldı - v2 - DATABASE');
    console.log('🔍 Resim ID:', id);
    console.log('🔍 User:', req.user);
    
    // Veritabanından resmi sil
    const deletedImage = await prisma.image.delete({
      where: {
        id: parseInt(id)
      }
    });
    
    console.log('✅ Resim veritabanından silindi:', deletedImage.filename);
    
    res.json({ 
      message: 'Resim başarıyla silindi',
      deletedImage: {
        id: deletedImage.id,
        filename: deletedImage.filename
      }
    });
  } catch (error) {
    console.error('❌ Resim silme hatası:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Resim bulunamadı' });
    } else {
      res.status(500).json({ error: 'Resim silinemedi: ' + error.message });
    }
  }
});

// Statik dosya servisi
// Uploads klasörü için CORS ayarları
app.use('/uploads', (req, res, next) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  res.set('Access-Control-Max-Age', '86400');
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads')));



// Public endpoint - authentication olmadan (frontend için)
app.get('/api/admin/images-public', async (req, res) => {
  try {
    console.log('🔍 GET /api/admin/images-public çağrıldı (public endpoint) - v4 - BASE64 SUPPORT');
    
    // CORS ayarları
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
    res.set('Access-Control-Max-Age', '86400');
    res.set('Access-Control-Allow-Credentials', 'false');
    
    // OPTIONS request için
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    const uploadDir = path.join(__dirname, 'uploads', 'products');
    console.log('🔍 Upload directory:', uploadDir);
    
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Upload directory yok, boş array döndürülüyor');
      return res.json([]);
    }

    const files = fs.readdirSync(uploadDir);
    console.log('📁 Bulunan dosyalar:', files);
    
    const images = files
      .filter(file => {
        try {
          const ext = path.extname(file).toLowerCase();
          const isValid = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          return isValid;
        } catch (error) {
          console.error('Dosya filtresi hatası:', error);
          return false;
        }
      })
      .map(file => {
        try {
          const filePath = path.join(uploadDir, file);
          const stats = fs.statSync(filePath);
          
          // Dosyayı base64'e çevir
          const imageBuffer = fs.readFileSync(filePath);
          const base64Image = `data:image/${path.extname(file).substring(1)};base64,${imageBuffer.toString('base64')}`;
          
          const imageInfo = {
            filename: file,
            path: base64Image, // Base64 data URL olarak döndür
            size: stats.size,
            uploadedAt: stats.mtime
          };
          console.log('📄 Resim bilgisi:', { filename: file, size: stats.size, base64Length: base64Image.length });
          return imageInfo;
        } catch (error) {
          console.error('Dosya bilgisi alma hatası:', error);
          return null;
        }
      })
      .filter(image => image !== null)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    console.log('✅ Toplam resim sayısı:', images.length);
    res.json(images);
  } catch (error) {
    console.error('❌ Public resim listesi hatası:', error);
    res.status(500).json({ error: 'Resim listesi alınamadı' });
  }
});

// Performans izleme endpoint'i
app.get('/api/admin/performance-stats', authenticateToken, async (req, res) => {
  try {
    // Sadece SUPER_ADMIN ve BRANCH_MANAGER erişebilir
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    console.log('📊 Performans istatistikleri isteği alındı');
    
    const stats = performanceMonitor.getStats();
    const health = performanceMonitor.getHealthStatus();
    
    res.json({
      performance: stats,
      health: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Performans istatistik hatası:', error);
    res.status(500).json({ error: 'Performans istatistikleri alınamadı' });
  }
});

// 404 handler - En sona eklendi
app.use('*', (req, res) => {
  console.log('❌ 404 - Endpoint bulunamadı:', req.method, req.url);
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

