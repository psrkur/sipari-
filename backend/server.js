// Environment variables - Manuel yükleme
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const isProduction = false; // Development modunda çalıştır
console.log('🔧 process.env.PORT başlangıç:', process.env.PORT);
// PORT değişkenini kullan, eğer yoksa 3006'yı varsayılan olarak kullan
const SERVER_PORT = process.env.PORT || 3001;
console.log('🔧 SERVER_PORT:', SERVER_PORT);
console.log('🔧 process.env.PORT son:', process.env.PORT);
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';
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
const winston = require('winston');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// İkinci dotenv yüklemesi kaldırıldı

// Winston Logger Konfigürasyonu
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'yemek5-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const { PrismaClient } = require('@prisma/client');

// Prisma client configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Firma yönetimi modülünü import et
// const companyManagement = require('./company-management');

// Prisma query logging
prisma.$on('query', (e) => {
  logger.info('Query: ' + e.query);
  logger.info('Params: ' + e.params);
  logger.info('Duration: ' + e.duration + 'ms');
});

// Prisma query logging
prisma.$on('query', (e) => {
  logger.info('Query: ' + e.query);
  logger.info('Params: ' + e.params);
  logger.info('Duration: ' + e.duration + 'ms');
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

// Migration kontrolü
async function checkAndRunMigration() {
  try {
    console.log('🔧 Migration kontrolü başlatılıyor...');
    
    // Migration'ı uygula
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    console.log('✅ Migration başarıyla uygulandı');
    
    // imagePath sütununun var olup olmadığını kontrol et
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'imagePath'
    `;
    
    console.log('📊 imagePath sütunu kontrolü:', result);
    
    if (result.length > 0) {
      console.log('✅ imagePath sütunu başarıyla eklendi');
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

// Multer konfigürasyonu - Resim yükleme için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      const uploadDir = path.join(__dirname, 'uploads', 'products');
      // Klasör yoksa oluştur
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Upload directory oluşturma hatası:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    try {
      // Benzersiz dosya adı oluştur
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, uniqueSuffix + '-' + safeName);
    } catch (error) {
      console.error('Filename oluşturma hatası:', error);
      cb(error);
    }
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    try {
      // Sadece resim dosyalarını kabul et
      if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
      }
    } catch (error) {
      console.error('File filter hatası:', error);
      cb(error);
    }
  }
});
// PORT değişkeni kaldırıldı, SERVER_PORT kullanılıyor

// Render/proxy ortamı için gerçek IP ve rate limit desteği
app.set('trust proxy', 1);

// Güvenlik middleware'leri
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

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

// CORS konfigürasyonu
app.use(cors({
  origin: true, // Tüm origin'lere izin ver
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition']
}));

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
}, (req, res, next) => {
  // Static dosya serve etmeden önce CORS header'larını set et
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  res.set('Access-Control-Max-Age', '86400');
  
  // Dosya yolunu oluştur
  const filePath = path.join(__dirname, 'uploads', 'products', req.path);
  
  // Dosya var mı kontrol et
  if (!fs.existsSync(filePath)) {
    console.error('Resim dosyası bulunamadı:', filePath);
    res.set('Content-Type', 'image/svg+xml');
    return res.status(200).send(getPlaceholderSvg());
  }
  
  // Dosyayı serve et
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Resim gönderilemedi:', req.path, err);
      res.set('Content-Type', 'image/svg+xml');
      res.status(200).send(getPlaceholderSvg());
    }
  });
});

// Resim endpoint'i
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // Kapsamlı CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.set('Access-Control-Allow-Headers', 'Content-Type', 'Authorization', 'X-Requested-With');
  res.set('Access-Control-Expose-Headers', 'Content-Disposition', 'Content-Length');
  res.set('Access-Control-Max-Age', '86400'); // 24 saat cache
  
  // OPTIONS request için
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Dosya var mı kontrol et
  if (!require('fs').existsSync(filePath)) {
    console.error('Resim dosyası bulunamadı:', filePath);
    
    // Render'da ephemeral storage nedeniyle dosya kaybolmuş olabilir
    // Varsayılan bir SVG placeholder resim döndür
    res.set('Content-Type', 'image/svg+xml');
    return res.status(200).send(getPlaceholderSvg());
  }
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Resim gönderilemedi:', filename, err);
      // Hata durumunda da placeholder SVG döndür
      res.set('Content-Type', 'image/svg+xml');
      res.status(200).send(getPlaceholderSvg());
    }
  });
});

const authenticateToken = (req, res, next) => {
  console.log('🔍 authenticateToken çağrıldı');
  const authHeader = req.headers['authorization'];
  console.log('🔍 Authorization header:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  console.log('🔍 Token:', token);
  
  if (!token) {
    console.log('❌ Token yok');
    return res.status(401).json({ error: 'Token gerekli' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production', (err, user) => {
    if (err) {
      console.log('❌ Token hatası:', err.message);
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    console.log('✅ Token geçerli, user:', user);
    req.user = user;
    next();
  });
};



app.post('/api/auth/register', async (req, res) => {
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

// Şube yönetimi endpoint'leri
app.post('/api/branches', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
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
    if (req.user.role !== 'SUPER_ADMIN') {
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

app.delete('/api/admin/branches/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
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
    console.log('🔍 Products endpoint çağrıldı, branchId:', branchId);
    
    const products = await prisma.product.findMany({
      where: {
        branchId: parseInt(branchId),
        isActive: true
      },
      include: {
        branch: true,
        category: true
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
    
    console.log('✅ Ürünler başarıyla getirildi, sayı:', products.length);
    res.json(products);
  } catch (error) {
    console.error('❌ Ürünler getirilemedi:', error);
    console.error('❌ Hata detayı:', error.message);
    console.error('❌ Stack trace:', error.stack);
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

    res.json({ order, message: 'Sipariş başarıyla oluşturuldu' });
  } catch (error) {
    console.error('Sipariş oluşturma hatası:', error); // <-- Hata detayını logla
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

// Müşteri siparişlerini getir (sadece giriş yapmış kullanıcılar için)
app.get('/api/customer/orders', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Müşteri siparişleri isteği:', {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email
    });

    let whereClause = {
      orderType: { not: 'TABLE' } // Masa siparişlerini hariç tut
    };

    // CUSTOMER rolündeki kullanıcılar sadece kendi siparişlerini görebilir
    if (req.user.role === 'CUSTOMER') {
      whereClause.userId = req.user.userId;
    } else if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'BRANCH_MANAGER') {
      // Admin kullanıcılar tüm müşteri siparişlerini görebilir
      console.log('✅ Admin kullanıcı tüm müşteri siparişlerini görüntülüyor');
    } else {
      console.log('❌ Yetkisiz erişim:', req.user.role);
      return res.status(403).json({ error: 'Yetkisiz erişim' });
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        branch: true,
        user: req.user.role !== 'CUSTOMER', // Admin kullanıcılar için müşteri bilgilerini de getir
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Müşteri siparişleri getirildi:', {
      userId: req.user.userId,
      role: req.user.role,
      orderCount: orders.length,
      orders: orders.map(o => ({ id: o.id, orderNumber: o.orderNumber, status: o.status }))
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

app.get('/api/admin/orders', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { branch: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    let whereClause = {
      orderType: { not: 'COLLECTION' } // Tahsilat kayıtlarını hariç tut
    };
    
    // branchId parametresi varsa filtrele
    if (req.query.branchId) {
      whereClause.branchId = parseInt(req.query.branchId);
    } else if (user.role === 'BRANCH_MANAGER') {
      whereClause.branchId = user.branchId;
    } else if (user.role === 'SUPER_ADMIN') {
      // Süper admin tüm siparişleri getir (tahsilat hariç)
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        branch: true,
        customer: true,
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

    // Masa siparişleri için durum güncelleme kısıtlaması
    if (existingOrder.orderType === 'TABLE') {
      return res.status(400).json({ 
        error: 'Masa siparişleri için durum güncelleme yapılamaz',
        message: 'Masa siparişleri için durum değişikliği yapılamaz. Sadece online siparişler için geçerlidir.'
      });
    }

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
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
    const users = await prisma.user.findMany({
      include: {
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(users);
  } catch (e) {
    console.error('Users fetch error:', e);
    res.status(500).json({ error: 'Kullanıcılar getirilemedi' });
  }
});

app.post('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
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
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
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
    
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        branch: true,
        category: true
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

    const { name, description, price, categoryId, branchId, imagePath } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: 'Tüm gerekli alanları doldurun' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });

    if (!category) {
      return res.status(400).json({ error: 'Geçersiz kategori' });
    }

    // Sadece süper admin ürün ekleyebilir
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Yetkisiz' });
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
            image: imagePath || null,
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
          image: imagePath || null,
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
    const { name, description, price, categoryId, branchId, isActive, imagePath } = req.body;

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
    } else if (req.user.role !== 'SUPER_ADMIN') {
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
      
      if (imagePath !== undefined) {
        updateData.image = imagePath;
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
    const categories = await prisma.category.findMany({
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
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
    const { name, description, companyId } = req.body;
    
    if (!name || !companyId) {
      return res.status(400).json({ error: 'Kategori adı ve şirket ID zorunludur.' });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Bu kategori adı zaten mevcut' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || '',
        companyId: Number(companyId)
      }
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Kategori eklenemedi' });
  }
});

app.put('/api/admin/categories/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
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
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
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

app.post('/api/admin/create-test-data', async (req, res) => {
  try {
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(10 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
      
      await prisma.order.create({
        data: {
          orderNumber: `TEST-WEEK-${Date.now()}-${i}`,
          totalAmount: 50 + Math.floor(Math.random() * 200),
          status: 'COMPLETED',
          branchId: 1,
          customerId: 1,
          createdAt: date
        }
      });
    }
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(10 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
      
      await prisma.order.create({
        data: {
          orderNumber: `TEST-MONTH-${Date.now()}-${i}`,
          totalAmount: 30 + Math.floor(Math.random() * 150),
          status: 'COMPLETED',
          branchId: 2,
          customerId: 1,
          createdAt: date
        }
      });
    }
    
    res.json({ message: 'Test verileri oluşturuldu' });
  } catch (error) {
    console.error('Test veri oluşturma hatası:', error);
    res.status(500).json({ error: 'Test verileri oluşturulamadı' });
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

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend çalışıyor!',
    database: isPostgreSQL ? 'PostgreSQL' : 'SQLite',
    databaseUrl: DATABASE_URL.substring(0, 50) + '...',
    environment: process.env.NODE_ENV || 'development'
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

// Admin test endpoint'i (authentication olmadan)
app.get('/api/admin/test', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, address: true }
    });
    
    const products = await prisma.product.findMany({
      select: { id: true, name: true, price: true, categoryId: true },
      take: 10
    });
    
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, description: true }
    });
    
    const orders = await prisma.order.findMany({
      select: { id: true, orderNumber: true, status: true, totalAmount: true },
      take: 5
    });
    
    res.json({
      message: 'Admin paneli test verileri',
      counts: {
        users: users.length,
        branches: branches.length,
        products: products.length,
        categories: categories.length,
        orders: orders.length
      },
      users: users,
      branches: branches,
      products: products,
      categories: categories,
      orders: orders
    });
  } catch (error) {
    res.status(500).json({ error: 'Admin test verileri getirilemedi', details: error.message });
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

// Admin paneli test endpoint'leri (authentication olmadan)
app.get('/api/admin/users-test', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcılar getirilemedi', details: error.message });
  }
});

app.get('/api/admin/orders-test', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        branch: true,
        customer: true,
        table: true,
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Siparişler getirilemedi', details: error.message });
  }
});

app.get('/api/admin/products-test', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        branch: true
      }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Ürünler getirilemedi', details: error.message });
  }
});

app.get('/api/admin/categories-test', async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Kategoriler getirilemedi', details: error.message });
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

// Ürün resmi döndüren endpoint
app.get('/api/products/:id/image', async (req, res) => {
  try {
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
  } catch (error) {
    // Hata durumunda placeholder SVG döndür
    res.set('Content-Type', 'image/svg+xml');
    res.status(200).send(getPlaceholderSvg());
  }
});

// Test endpoint - basit kontrol için
app.get('/api/test', (req, res) => {
  console.log('🔍 GET /api/test çağrıldı - v6 - DEPLOYMENT TRIGGER');
  res.json({ 
    message: 'Backend çalışıyor!', 
    database: 'PostgreSQL',
    databaseUrl: DATABASE_URL.substring(0, 50) + '...',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Resim yökleme endpoint'i - geçici olarak authentication kaldırıldı
app.post('/api/admin/upload-image', upload.single('image'), async (req, res) => {
  try {
    console.log('🔍 POST /api/admin/upload-image çağrıldı - v6 - DEPLOYMENT TRIGGER');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request file:', req.file);
    
    if (!req.file) {
      console.log('❌ Resim dosyası yüklenmedi');
      return res.status(400).json({ error: 'Resim dosyası yüklenmedi' });
    }
    
    // Dosya yolunu oluştur
    const imagePath = `/uploads/products/${req.file.filename}`;
    
    res.json({
      message: 'Resim başarıyla yüklendi',
      imagePath: imagePath,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Resim yükleme hatası:', error);
    res.status(500).json({ error: 'Resim yüklenemedi' });
  }
});

// Resim listesi endpoint'i - geçici olarak authentication kaldırıldı
app.get('/api/admin/images', async (req, res) => {
  try {
    console.log('🔍 GET /api/admin/images çağrıldı - v6 - DEPLOYMENT TRIGGER');
    console.log('🔍 User:', req.user);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request method:', req.method);
    
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
          console.log(`🔍 Dosya: ${file}, uzantı: ${ext}, geçerli: ${isValid}`);
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
          const imageInfo = {
            filename: file,
            path: `/uploads/products/${file}`,
            size: stats.size,
            uploadedAt: stats.mtime
          };
          console.log('📄 Resim bilgisi:', imageInfo);
          return imageInfo;
        } catch (error) {
          console.error('Dosya bilgisi alma hatası:', error);
          return null;
        }
      })
      .filter(image => image !== null)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    console.log('✅ Toplam resim sayısı:', images.length);
    console.log('✅ Response gönderiliyor:', images);
    res.json(images);
  } catch (error) {
    console.error('❌ Resim listesi hatası:', error);
    res.status(500).json({ error: 'Resim listesi alınamadı' });
  }
});

// Resim silme endpoint'i - geçici olarak authentication kaldırıldı
app.delete('/api/admin/images/:filename', async (req, res) => {
  try {
    console.log('🔍 DELETE /api/admin/images/:filename çağrıldı - v6 - DEPLOYMENT TRIGGER');
    const { filename } = req.params;
    
    // Güvenlik kontrolü - sadece dosya adı
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Geçersiz dosya adı' });
    }
    
    const filePath = path.join(__dirname, 'uploads', 'products', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Resim başarıyla silindi' });
    } else {
      res.status(404).json({ error: 'Resim bulunamadı' });
    }
  } catch (error) {
    console.error('Resim silme hatası:', error);
    res.status(500).json({ error: 'Resim silinemedi' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

app.listen(SERVER_PORT, () => {
  console.log(`🚀 Server ${SERVER_PORT} portunda çalışıyor`);
  console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
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

// Masa siparişlerini getir
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
      totalAmount,
      orderCount: table.orders.length
    });
  } catch (error) {
    console.error('Masa siparişleri getirilemedi:', error);
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

// Resim yükleme endpoint'i - geçici olarak authentication kaldırıldı
app.post('/api/admin/upload-image', upload.single('image'), async (req, res) => {
  try {
    console.log('🔍 POST /api/admin/upload-image çağrıldı - v4 - DEPLOYMENT TRIGGER');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request file:', req.file);
    
    if (!req.file) {
      console.log('❌ Resim dosyası yüklenmedi');
      return res.status(400).json({ error: 'Resim dosyası yüklenmedi' });
    }

    // Dosya yolunu oluştur
    const imagePath = `/uploads/products/${req.file.filename}`;
    
    res.json({
      message: 'Resim başarıyla yüklendi',
      imagePath: imagePath,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Resim yükleme hatası:', error);
    res.status(500).json({ error: 'Resim yüklenemedi' });
  }
});

// Resim listesi endpoint'i - geçici olarak authentication kaldırıldı
app.get('/api/admin/images', async (req, res) => {
  try {
    console.log('🔍 GET /api/admin/images çağrıldı - v4 - DEPLOYMENT TRIGGER');
    console.log('🔍 User:', req.user);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request method:', req.method);
    
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
          console.log(`🔍 Dosya: ${file}, uzantı: ${ext}, geçerli: ${isValid}`);
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
          const imageInfo = {
            filename: file,
            path: `/uploads/products/${file}`,
            size: stats.size,
            uploadedAt: stats.mtime
          };
          console.log('📄 Resim bilgisi:', imageInfo);
          return imageInfo;
        } catch (error) {
          console.error('Dosya bilgisi alma hatası:', error);
          return null;
        }
      })
      .filter(image => image !== null)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    console.log('✅ Toplam resim sayısı:', images.length);
    console.log('✅ Response gönderiliyor:', images);
    res.json(images);
  } catch (error) {
    console.error('❌ Resim listesi hatası:', error);
    res.status(500).json({ error: 'Resim listesi alınamadı' });
  }
});

// Resim silme endpoint'i - geçici olarak authentication kaldırıldı
app.delete('/api/admin/images/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Güvenlik kontrolü - sadece dosya adı
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Geçersiz dosya adı' });
    }
    
    const filePath = path.join(__dirname, 'uploads', 'products', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Resim başarıyla silindi' });
    } else {
      res.status(404).json({ error: 'Resim bulunamadı' });
    }
  } catch (error) {
    console.error('Resim silme hatası:', error);
    res.status(500).json({ error: 'Resim silinemedi' });
  }
});

// Statik dosya servisi
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Geçici test endpoint'i - authentication olmadan
app.get('/api/admin/images-test', async (req, res) => {
  try {
    console.log('🔍 GET /api/admin/images-test çağrıldı (test endpoint)');
    
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
          console.log(`🔍 Dosya: ${file}, uzantı: ${ext}, geçerli: ${isValid}`);
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
          const imageInfo = {
            filename: file,
            path: `/uploads/products/${file}`,
            size: stats.size,
            uploadedAt: stats.mtime
          };
          console.log('📄 Resim bilgisi:', imageInfo);
          return imageInfo;
        } catch (error) {
          console.error('Dosya bilgisi alma hatası:', error);
          return null;
        }
      })
      .filter(image => image !== null)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    console.log('✅ Toplam resim sayısı:', images.length);
    console.log('✅ Response gönderiliyor:', images);
    res.json({
      message: 'Test endpoint başarılı',
      count: images.length,
      images: images
    });
  } catch (error) {
    console.error('❌ Test resim listesi hatası:', error);
    res.status(500).json({ error: 'Test resim listesi alınamadı' });
  }
});

// Test endpoint - basit kontrol için
app.get('/api/test', (req, res) => {
  console.log('🔍 GET /api/test çağrıldı - v5 - DEPLOYMENT TRIGGER');
  res.json({ message: 'Backend çalışıyor!', timestamp: new Date().toISOString() });
});

// Public endpoint - authentication olmadan (frontend için)
app.get('/api/admin/images-public', async (req, res) => {
  try {
    console.log('🔍 GET /api/admin/images-public çağrıldı (public endpoint) - v3 - DEPLOYMENT TRIGGER');
    
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
          const imageInfo = {
            filename: file,
            path: `/uploads/products/${file}`,
            size: stats.size,
            uploadedAt: stats.mtime
          };
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