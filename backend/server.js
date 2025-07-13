// Environment variables - Otomatik bağlantı
const isProduction = process.env.NODE_ENV === 'production';
const SERVER_PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://siparisnet.netlify.app';

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./dev.db'
    }
  }
});

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Veritabanı bağlantısı başarılı');
    
    try {
      const branchCount = await prisma.branch.count();
      const userCount = await prisma.user.count();
      console.log(`📊 Mevcut veriler: ${branchCount} şube, ${userCount} kullanıcı`);
      return true;
    } catch (tableError) {
      console.log('⚠️ Tablolar henüz oluşturulmamış');
      return false;
    }
  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error);
    return false;
  }
}

testDatabaseConnection();

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: isProduction 
    ? [FRONTEND_URL, 'https://siparisnet.netlify.app', 'https://yemek5-backend.onrender.com', 'https://*.netlify.app', 'https://*.onrender.com']
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
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
        role: 'CUSTOMER'
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, branchId: user.branchId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        phone: user.phone,
        address: user.address,
        role: user.role,
        branchId: user.branchId
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Kayıt hatası' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Geçersiz şifre' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, branchId: user.branchId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId } });
  } catch (error) {
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

app.get('/api/products/:branchId', async (req, res) => {
  try {
    const { branchId } = req.params;
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
    res.json(products);
  } catch (error) {
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
        notes: `${deliveryType === 'delivery' ? 'Adrese Teslim' : 'Şubeden Al'} - Ödeme: ${paymentText} - ${notes || ''}`
      }
    });

    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          quantity: item.quantity,
          price: item.price,
          orderId: order.id,
          productId: item.productId
        }
      });
    }

    res.json({ order, message: 'Sipariş başarıyla oluşturuldu' });
  } catch (error) {
    res.status(500).json({ error: 'Sipariş oluşturulamadı' });
  }
});

app.get('/api/admin/orders', authenticateToken, async (req, res) => {
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

    let whereClause = {};
    
    if (user.role === 'BRANCH_MANAGER') {
      whereClause.branchId = user.branchId;
    } else if (user.role === 'SUPER_ADMIN') {
      // Süper admin tüm siparişleri getir
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        branch: true,
        customer: true,
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

    const order = await prisma.order.update({
      where: whereClause,
      data: { status }
    });

    res.json(order);
  } catch (error) {
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
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
    const products = await prisma.product.findMany({
      include: {
        branch: true,
        category: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Ürünler getirilemedi' });
  }
});

app.post('/api/admin/products', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, categoryId, branchId } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !price || !categoryId || !branchId) {
      return res.status(400).json({ error: 'Tüm gerekli alanları doldurun' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });

    if (!category) {
      return res.status(400).json({ error: 'Geçersiz kategori' });
    }

    if (branchId === 'all') {
      const allBranches = await prisma.branch.findMany({ where: { isActive: true } });
      const products = [];

      for (const branch of allBranches) {
        const product = await prisma.product.create({
          data: {
            name,
            description: description || '',
            price: Number(price),
            categoryId: parseInt(categoryId),
            image,
            branchId: branch.id
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
      const product = await prisma.product.create({
        data: {
          name,
          description: description || '',
          price: Number(price),
          categoryId: parseInt(categoryId),
          image,
          branchId: Number(branchId)
        },
        include: {
          branch: true,
          category: true
        }
      });

      res.status(201).json(product);
    }
  } catch (error) {
    res.status(500).json({ error: 'Ürün eklenemedi' });
  }
});

app.put('/api/admin/products/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, categoryId, branchId, isActive } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    if (!name || !price || !categoryId || !branchId) {
      return res.status(400).json({ error: 'Tüm gerekli alanları doldurun' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });

    if (!category) {
      return res.status(400).json({ error: 'Geçersiz kategori' });
    }

    if (branchId === 'all') {
      // Bu durumda devam et
    } else if (isNaN(parseInt(branchId))) {
      return res.status(400).json({ error: 'Geçersiz şube seçimi. Lütfen bir şube seçin.' });
    }

    let isActiveBool = isActive;
    if (typeof isActiveBool === 'string') {
      isActiveBool = isActiveBool === 'true';
    }

    const updateData = {
      name,
      description: description || '',
      price: Number(price),
      categoryId: parseInt(categoryId),
      branchId: Number(branchId),
      isActive: isActiveBool !== undefined ? isActiveBool : true
    };
    if (image !== undefined) updateData.image = image;

    if (branchId === 'all') {
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
      const product = await prisma.product.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          branch: true,
          category: true
        }
      });

      res.json(product);
    }
  } catch (error) {
    res.status(500).json({ error: 'Ürün güncellenemedi' });
  }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    const { id } = req.params;
    
    await prisma.product.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Ürün silindi' });
  } catch (e) {
    res.status(500).json({ error: 'Ürün silinemedi' });
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
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Kategoriler getirilemedi' });
  }
});

app.post('/api/admin/categories', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Yetkisiz' });
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Kategori adı gerekli' });
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
        description: description || ''
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

app.get('/api/customer/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        orders: {
          include: {
            branch: true,
            items: {
              include: {
                product: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
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
      orders: user.orders
    });
  } catch (error) {
    res.status(500).json({ error: 'Profil bilgileri getirilemedi' });
  }
});

app.put('/api/customer/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, email, phone, address }
    });

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
    res.status(500).json({ error: 'Profil güncellenemedi' });
  }
});

async function seedData() {
  try {
    await prisma.$connect();
    
    // Veritabanında veri var mı kontrol et
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log('✅ Veritabanında zaten veri var, seed data atlanıyor');
      return;
    }
    
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
        role: 'SUPER_ADMIN'
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
        branchId: 1
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



// Veritabanı başlatma ve seed logic'i - Güvenli versiyon
async function initializeDatabase() {
  try {
    console.log('🔍 Veritabanı bağlantısı test ediliyor...');
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      // Veritabanında veri var mı kontrol et
      const existingData = await prisma.user.count();
      
      if (existingData === 0) {
        console.log('📊 Veritabanı boş, seed data oluşturuluyor...');
        await seedData();
        console.log('✅ Seed data başarıyla oluşturuldu');
      } else {
        console.log('✅ Veritabanında mevcut veriler var, seed data atlanıyor');
        console.log(`📊 Mevcut kullanıcı sayısı: ${existingData}`);
      }
    } else {
      console.log('⚠️ Veritabanı tabloları oluşturulmamış');
      console.log('🔧 Güvenli migration yapılıyor...');
      
      try {
        console.log('🔧 Veritabanı tablolarını oluşturmayı deniyorum...');
        const { execSync } = require('child_process');
        
        // Güvenli migration - sadece tabloları oluştur
        execSync('npx prisma db push --accept-data-loss=false', { stdio: 'inherit' });
        console.log('✅ Veritabanı tabloları oluşturuldu');
        
        // Tablolar oluşturulduktan sonra seed data ekle
        setTimeout(async () => {
          try {
            await seedData();
            console.log('✅ Seed data başarıyla oluşturuldu');
          } catch (seedError) {
            console.error('❌ Seed data hatası:', seedError);
          }
        }, 3000);
      } catch (migrationError) {
        console.error('❌ Migration hatası:', migrationError);
        console.log('💡 Alternatif migration yöntemi deneniyor...');
        
        // Alternatif yöntem: Prisma client ile migration
        try {
          console.log('🔧 Prisma client ile migration deneniyor...');
          await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS public`;
          console.log('✅ Schema oluşturuldu');
          
          // Tabloları manuel oluştur
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "User" (
              "id" SERIAL PRIMARY KEY,
              "email" TEXT NOT NULL UNIQUE,
              "password" TEXT NOT NULL,
              "name" TEXT,
              "phone" TEXT,
              "address" TEXT,
              "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
              "branchId" INTEGER,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL
            )
          `;
          
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "Branch" (
              "id" SERIAL PRIMARY KEY,
              "name" TEXT NOT NULL,
              "address" TEXT,
              "phone" TEXT,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL
            )
          `;
          
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "Category" (
              "id" SERIAL PRIMARY KEY,
              "name" TEXT NOT NULL,
              "description" TEXT,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL
            )
          `;
          
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "Product" (
              "id" SERIAL PRIMARY KEY,
              "name" TEXT NOT NULL,
              "description" TEXT,
              "price" DECIMAL(10,2) NOT NULL,
              "image" TEXT,
              "categoryId" INTEGER,
              "branchId" INTEGER,
              "isActive" BOOLEAN NOT NULL DEFAULT true,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL
            )
          `;
          
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "Customer" (
              "id" SERIAL PRIMARY KEY,
              "name" TEXT NOT NULL,
              "phone" TEXT NOT NULL UNIQUE,
              "email" TEXT,
              "address" TEXT,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL
            )
          `;
          
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "Order" (
              "id" SERIAL PRIMARY KEY,
              "orderNumber" TEXT NOT NULL UNIQUE,
              "totalAmount" DECIMAL(10,2) NOT NULL,
              "status" TEXT NOT NULL DEFAULT 'PENDING',
              "notes" TEXT,
              "customerId" INTEGER,
              "branchId" INTEGER NOT NULL,
              "deliveryType" TEXT DEFAULT 'PICKUP',
              "paymentMethod" TEXT DEFAULT 'CASH',
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL
            )
          `;
          
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "OrderItem" (
              "id" SERIAL PRIMARY KEY,
              "orderId" INTEGER NOT NULL,
              "productId" INTEGER NOT NULL,
              "quantity" INTEGER NOT NULL,
              "price" DECIMAL(10,2) NOT NULL,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL
            )
          `;
          
          console.log('✅ Tablolar başarıyla oluşturuldu');
          
          // Seed data ekle
          setTimeout(async () => {
            try {
              await seedData();
              console.log('✅ Seed data başarıyla oluşturuldu');
            } catch (seedError) {
              console.error('❌ Seed data hatası:', seedError);
            }
          }, 2000);
          
        } catch (rawError) {
          console.error('❌ Raw SQL migration hatası:', rawError);
          console.log('💡 Veritabanı tabloları manuel olarak oluşturulmalı');
        }
      }
    }
  } catch (error) {
    console.error('❌ Veritabanı başlatma hatası:', error);
  }
}

// Veritabanını başlat
initializeDatabase();

app.get('/', (req, res) => {
  res.json({ 
    message: 'Fast Food Sales API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      branches: 'GET /api/branches',
      products: 'GET /api/products/:branchId',
      orders: 'POST /api/orders',
      admin: {
        orders: 'GET /api/admin/orders',
        updateOrderStatus: 'PUT /api/admin/orders/:id/status'
      },
      seed: 'POST /api/seed'
    }
  });
});

app.use((err, req, res, next) => {
  res.status(500).json({ 
    error: 'Sunucu hatası',
    message: isProduction ? 'Bir hata oluştu' : err.message 
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

app.listen(SERVER_PORT, () => {
  console.log(`🚀 Server ${SERVER_PORT} portunda çalışıyor`);
  console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
}); 