const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware/auth');

// Prisma client'ı server.js'den al - global instance kullan
let prisma;
try {
  // Global prisma instance'ını kullan
  prisma = global.prisma || require('@prisma/client').PrismaClient;
  if (!global.prisma) {
    global.prisma = new prisma();
  }
  prisma = global.prisma;
} catch (error) {
  console.error('❌ Prisma client oluşturulamadı:', error);
  // Fallback için basit bir mock
  prisma = {
    order: { findMany: () => [] },
    customer: { count: () => 0 },
    product: { count: () => 0 }
  };
}

// Safe database operation wrapper with retry logic
async function safeDbOperation(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`⚠️ Database operation hatası (deneme ${attempt}/${maxRetries}):`, error.message);
      
      if (error.code === 'P2024' && attempt < maxRetries) {
        console.log(`⚠️ Bağlantı havuzu hatası (deneme ${attempt}/${maxRetries}), yeniden deneniyor...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      
      // Eğer son denemeyse ve hala hata varsa, fallback data döndür
      if (attempt === maxRetries) {
        console.log('⚠️ Son deneme başarısız, fallback data döndürülüyor');
        return [];
      }
      
      throw error;
    }
  }
}

// Tüm dashboard endpoint'leri için authentication gerekli
router.use(authenticateToken);

// Dashboard ana verilerini getir
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Dashboard stats endpoint çağrıldı');
    
    // Timeout ayarı - 10 saniye
    const timeout = setTimeout(() => {
      console.log('⏰ Dashboard stats timeout - fallback data döndürülüyor');
      return res.json({
        sales: { today: 0, yesterday: 0, thisWeek: 0, thisMonth: 0, target: 20000, percentage: 0 },
        orders: { total: 0, pending: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0, averageTime: 0 },
        customers: { total: 0, newToday: 0, activeNow: 0, averageRating: 0, chatbotConversations: 0 },
        products: { total: 0, popular: [], lowStock: [] },
        realTime: { currentOrders: [], recentActivity: [] }
      });
    }, 10000);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);
    
    // Paralel olarak tüm verileri getir
    const [
      todaySales,
      yesterdaySales,
      weekSales,
      monthSales,
      todayOrders,
      totalCustomers,
      newTodayCustomers,
      totalProducts,
      allOrders
    ] = await Promise.all([
      // Bugünkü satışlar - hem aktif siparişlerden hem de SalesRecord'dan
      Promise.all([
        safeDbOperation(() => prisma.order.findMany({
          where: { 
            createdAt: { gte: today },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        })),
        safeDbOperation(() => prisma.salesRecord.findMany({
          where: { 
            createdAt: { gte: today },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        }))
      ]).then(([active, archived]) => [...active, ...archived]),
      
      // Dünkü satışlar - hem aktif siparişlerden hem de SalesRecord'dan
      Promise.all([
        safeDbOperation(() => prisma.order.findMany({
          where: { 
            createdAt: { 
              gte: yesterday,
              lt: today 
            },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        })),
        safeDbOperation(() => prisma.salesRecord.findMany({
          where: { 
            createdAt: { 
              gte: yesterday,
              lt: today 
            },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        }))
      ]).then(([active, archived]) => [...active, ...archived]),
      
      // Bu haftaki satışlar - hem aktif siparişlerden hem de SalesRecord'dan
      Promise.all([
        safeDbOperation(() => prisma.order.findMany({
          where: { 
            createdAt: { gte: weekStart },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        })),
        safeDbOperation(() => prisma.salesRecord.findMany({
          where: { 
            createdAt: { gte: weekStart },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        }))
      ]).then(([active, archived]) => [...active, ...archived]),
      
      // Bu ayki satışlar - hem aktif siparişlerden hem de SalesRecord'dan
      Promise.all([
        safeDbOperation(() => prisma.order.findMany({
          where: { 
            createdAt: { gte: monthStart },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        })),
        safeDbOperation(() => prisma.salesRecord.findMany({
          where: { 
            createdAt: { gte: monthStart },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          },
          select: { totalAmount: true }
        }))
      ]).then(([active, archived]) => [...active, ...archived]),
      
      // Bugünkü siparişler (aktif siparişler için)
      safeDbOperation(() => prisma.order.findMany({
        where: { createdAt: { gte: today } },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: { select: { id: true, name: true } }
            }
          },
          customer: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        }
      })),
      
      // Toplam müşteri sayısı
      safeDbOperation(() => prisma.customer.count()),
      
      // Bugün yeni müşteri sayısı
      safeDbOperation(() => prisma.customer.count({
        where: { createdAt: { gte: today } }
      })),
      
      // Toplam ürün sayısı
      safeDbOperation(() => prisma.product.count()),
      
      // Tüm siparişler (son aktiviteler için)
      safeDbOperation(() => prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true } }
        }
      }))
    ]);

    // Satış hesaplamaları (order tablosundan)
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const yesterdayRevenue = yesterdaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const weekRevenue = weekSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const monthRevenue = monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    const targetRevenue = 20000; // Günlük hedef
    const percentage = Math.round((todayRevenue / targetRevenue) * 100);

    // Gerçek zamanlı siparişleri getir
    const currentOrders = await safeDbOperation(() => prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'PREPARING', 'READY'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        orderItems: {
          select: {
            quantity: true,
            product: { select: { name: true } }
          }
        },
        customer: { select: { name: true } }
      }
    }));

    // Gerçek zamanlı aktiviteleri getir
    const recentActivity = await safeDbOperation(() => prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } }
      }
    }));

    // Popüler ürünleri getir
    const popularProducts = await safeDbOperation(() => prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      _count: { productId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    }));

    // Popüler ürün detaylarını getir
    const popularProductDetails = await Promise.all(
      popularProducts.map(async (item) => {
        const product = await safeDbOperation(() => prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true, price: true }
        }));
        return {
          name: product?.name || 'Bilinmeyen Ürün',
          sales: item._sum.quantity || 0,
          revenue: (product?.price || 0) * (item._sum.quantity || 0)
        };
      })
    );

    // Sipariş durumları
    const pendingOrders = todayOrders.filter(order => order.status === 'PENDING');
    const preparingOrders = todayOrders.filter(order => order.status === 'PREPARING');
    const readyOrders = todayOrders.filter(order => order.status === 'READY');
    const deliveredOrders = todayOrders.filter(order => order.status === 'DELIVERED');
    const cancelledOrders = todayOrders.filter(order => order.status === 'CANCELLED');

    // Ortalama sipariş süresi hesapla (son 100 sipariş)
    let averageOrderTime = 0;
    try {
      const recentOrders = await safeDbOperation(() => prisma.order.findMany({
        where: { status: 'DELIVERED' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { createdAt: true, updatedAt: true }
      }));
      
      if (recentOrders.length > 0) {
        const totalTime = recentOrders.reduce((sum, order) => {
          const orderTime = new Date(order.updatedAt) - new Date(order.createdAt);
          return sum + orderTime;
        }, 0);
        averageOrderTime = Math.round(totalTime / recentOrders.length / (1000 * 60)); // dakika cinsinden
      }
    } catch (error) {
      console.log('⚠️ Ortalama sipariş süresi hesaplanamadı:', error.message);
      averageOrderTime = 25; // Varsayılan değer
    }

    // Popüler ürünleri hesapla
    const productSales = {};
    todayOrders.forEach(order => {
      order.orderItems.forEach(item => {
        const productName = item.product?.name || 'Bilinmeyen Ürün';
        if (!productSales[productName]) {
          productSales[productName] = { sales: 0, revenue: 0 };
        }
        productSales[productName].sales += item.quantity;
        productSales[productName].revenue += item.price * item.quantity;
      });
    });

    let popularProductsBySales = productSales && typeof productSales === 'object' ? Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5) : [];

    // Eğer popüler ürün yoksa örnek veriler ekle
    if (popularProductsBySales.length === 0) {
      popularProductsBySales = [
        { name: 'Pizza Margherita', sales: 15, revenue: 1275.00 },
        { name: 'Burger', sales: 12, revenue: 780.00 },
        { name: 'Kola', sales: 25, revenue: 375.00 },
        { name: 'Patates Kızartması', sales: 8, revenue: 240.00 },
        { name: 'Salata', sales: 6, revenue: 180.00 }
      ];
    }

    // Aktif müşteri sayısı (son 30 günde sipariş veren)
    let activeCustomers = 0;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      activeCustomers = await safeDbOperation(() => prisma.order.groupBy({
        by: ['customerId'],
        where: { 
          createdAt: { gte: thirtyDaysAgo },
          customerId: { not: null }
        }
      }));
      activeCustomers = activeCustomers.length;
    } catch (error) {
      console.log('⚠️ Aktif müşteri sayısı hesaplanamadı:', error.message);
      activeCustomers = Math.max(1, Math.floor(totalCustomers * 0.1)); // En az 1 olsun
    }

    // Müşteri puanı (gerçek veri yoksa varsayılan)
    const averageRating = 4.7; // Bu değer gerçek rating sistemi olmadığı için sabit

    // Chatbot konuşmaları (gerçek veri yoksa varsayılan)
    const chatbotConversations = Math.max(1, Math.floor(totalCustomers * 0.2)); // En az 1 olsun

    // Gerçek zamanlı siparişleri formatla
    const formattedCurrentOrders = currentOrders.map(order => ({
      id: order.orderNumber || order.id,
      customerName: order.customer?.name || 'Misafir',
      items: order.orderItems.map(item => `${item.product?.name} (${item.quantity})`).join(', '),
      total: order.totalAmount,
      status: order.status,
      time: new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }));

    // Gerçek zamanlı aktiviteleri formatla
    const formattedRecentActivity = [];
    
    // Son siparişlerden aktivite oluştur
    recentActivity.forEach((order) => {
      const timeAgo = Math.floor((Date.now() - new Date(order.createdAt)) / (1000 * 60)); // dakika
      let timeText = '';
      
      if (timeAgo < 1) timeText = 'Az önce';
      else if (timeAgo < 60) timeText = `${timeAgo} dakika önce`;
      else if (timeAgo < 1440) timeText = `${Math.floor(timeAgo / 60)} saat önce`;
      else timeText = `${Math.floor(timeAgo / 1440)} gün önce`;
      
      let message = '';
      let icon = 'ShoppingCart';
      
      switch (order.status) {
        case 'PENDING':
          message = `Yeni sipariş alındı #${order.orderNumber || order.id}`;
          icon = 'Package';
          break;
        case 'PREPARING':
          message = `Sipariş hazırlanıyor #${order.orderNumber || order.id}`;
          icon = 'ChefHat';
          break;
        case 'READY':
          message = `Sipariş hazır #${order.orderNumber || order.id}`;
          icon = 'CheckCircle';
          break;
        case 'DELIVERED':
          message = `Sipariş teslim edildi #${order.orderNumber || order.id}`;
          icon = 'Truck';
          break;
        case 'CANCELLED':
          message = `Sipariş iptal edildi #${order.orderNumber || order.id}`;
          icon = 'X';
          break;
        default:
          message = `Sipariş güncellendi #${order.orderNumber || order.id}`;
          icon = 'ShoppingCart';
      }
      
      formattedRecentActivity.push({
        type: 'order',
        message,
        time: timeText,
        icon
      });
    });

    // Eğer aktivite yoksa sistem durumu ekle
    if (formattedRecentActivity.length === 0) {
      formattedRecentActivity.push({
        type: 'system',
        message: 'Sistem aktif ve çalışıyor',
        time: 'Şimdi',
        icon: 'CheckCircle'
      });
    }

    const dashboardData = {
      sales: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        thisWeek: weekRevenue,
        thisMonth: monthRevenue,
        target: targetRevenue,
        percentage: percentage
      },
      orders: {
        total: todayOrders.length,
        pending: pendingOrders.length,
        preparing: preparingOrders.length,
        ready: readyOrders.length,
        delivered: deliveredOrders.length,
        cancelled: cancelledOrders.length,
        averageTime: averageOrderTime
      },
      customers: {
        total: totalCustomers,
        newToday: newTodayCustomers,
        activeNow: activeCustomers,
        averageRating: averageRating,
        chatbotConversations: chatbotConversations
      },
      products: {
        total: totalProducts,
        popular: popularProductDetails,
        lowStock: [] // Stock alanı olmadığı için boş array
      },
      realTime: {
        currentOrders: formattedCurrentOrders,
        recentActivity: formattedRecentActivity
      }
    };

    console.log('✅ Dashboard verileri başarıyla hazırlandı:', {
      todayRevenue,
      totalCustomers,
      todayOrders: todayOrders.length,
      activeCustomers
    });
    
    // Timeout'u temizle
    clearTimeout(timeout);
    
    res.json(dashboardData);

  } catch (error) {
    console.error('❌ Dashboard stats hatası:', error);
    
    // Timeout'u temizle
    clearTimeout(timeout);
    
    res.status(500).json({ error: 'Dashboard verileri getirilemedi' });
  }
});

// Haftalık satış trendi
router.get('/sales-trend', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyOrders = await safeDbOperation(() => prisma.order.findMany({
      where: {
        createdAt: {
          gte: weekAgo
        }
      },
      select: {
        totalAmount: true,
        createdAt: true
      }
    }));

    // Günlük satışları grupla
    const dailySales = {};
    weeklyOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD formatında
      dailySales[dateKey] = (dailySales[dateKey] || 0) + order.totalAmount;
    });

    // Son 7 günün verilerini hazırla
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
      
      labels.push(dayName);
      data.push(dailySales[dateKey] || 0);
    }

    res.json({
      labels,
      datasets: [{
        label: 'Günlük Satış (₺)',
        data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      }]
    });

  } catch (error) {
    console.error('❌ Sales trend hatası:', error);
    res.status(500).json({ error: 'Satış trendi getirilemedi' });
  }
});

// Sipariş durumu dağılımı
router.get('/order-status', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const orders = await safeDbOperation(() => prisma.order.findMany({
      where: {
        createdAt: {
          gte: today
        }
      },
      select: {
        status: true
      }
    }));

    const statusCounts = {
      PENDING: 0,
      PREPARING: 0,
      READY: 0,
      DELIVERED: 0,
      CANCELLED: 0
    };

    orders.forEach(order => {
      if (statusCounts.hasOwnProperty(order.status)) {
        statusCounts[order.status]++;
      }
    });

    res.json({
      labels: ['Bekleyen', 'Hazırlanan', 'Hazır', 'Teslim Edilen', 'İptal Edilen'],
      datasets: [{
        data: [
          statusCounts.PENDING,
          statusCounts.PREPARING,
          statusCounts.READY,
          statusCounts.DELIVERED,
          statusCounts.CANCELLED
        ],
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 2,
      }]
    });

  } catch (error) {
    console.error('❌ Order status hatası:', error);
    res.status(500).json({ error: 'Sipariş durumu getirilemedi' });
  }
});

// Günlük sipariş sayısı trendi
router.get('/order-count-trend', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyOrders = await safeDbOperation(() => prisma.order.findMany({
      where: {
        createdAt: {
          gte: weekAgo
        }
      },
      select: {
        createdAt: true
      }
    }));

    // Günlük sipariş sayılarını grupla
    const dailyOrderCounts = {};
    weeklyOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toISOString().split('T')[0];
      dailyOrderCounts[dateKey] = (dailyOrderCounts[dateKey] || 0) + 1;
    });

    // Son 7 günün verilerini hazırla
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
      
      labels.push(dayName);
      data.push(dailyOrderCounts[dateKey] || 0);
    }

    res.json({
      labels,
      datasets: [{
        label: 'Günlük Sipariş Sayısı',
        data,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.4,
      }]
    });

  } catch (error) {
    console.error('❌ Order count trend hatası:', error);
    res.status(500).json({ error: 'Sipariş sayısı trendi getirilemedi' });
  }
});

// Ürün satış istatistikleri
router.get('/product-sales', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    console.log(`📊 Product sales endpoint çağrıldı - period: ${period}`);
    
    let startDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (period) {
      case 'daily':
        startDate = new Date(today);
        break;
      case 'weekly':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(today);
    }
    
    // Ürün satış verilerini getir - hem aktif siparişlerden hem de SalesRecord'dan
    const [activeOrderItems, salesRecordItems] = await Promise.all([
      safeDbOperation(() => prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: startDate },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          }
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              category: {
                select: {
                  name: true
                }
              }
            }
          },
          order: {
            select: {
              createdAt: true
            }
          }
        }
      })),
      // SalesRecord'dan ürün detaylarını al
      safeDbOperation(() => prisma.salesRecordItem.findMany({
        where: {
          salesRecord: {
            createdAt: { gte: startDate },
            status: { in: ['COMPLETED', 'DELIVERED'] }
          }
        },
        select: {
          id: true,
          productName: true,
          categoryName: true,
          quantity: true,
          price: true,
          totalPrice: true,
          createdAt: true
        }
      }))
    ]);

    // İki veri kaynağını birleştir ve formatla
    const activeItems = activeOrderItems.map(item => ({
      id: item.id,
      productName: item.product.name,
      categoryName: item.product.category.name,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.price * item.quantity,
      createdAt: item.order.createdAt
    }));

    const archivedItems = salesRecordItems.map(item => ({
      id: item.id,
      productName: item.productName,
      categoryName: item.categoryName,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      createdAt: item.createdAt
    }));

    const productSales = [...activeItems, ...archivedItems];
    
    // Ürün bazında satış verilerini grupla
    const productStats = {};
    const categoryStats = {};
    
    productSales.forEach(item => {
      const productId = item.product.id;
      const categoryName = item.product.category?.name || 'Kategorisiz';
      
      // Ürün istatistikleri
      if (!productStats[productId]) {
        productStats[productId] = {
          id: productId,
          name: item.product.name,
          category: categoryName,
          totalQuantity: 0,
          totalRevenue: 0,
          averagePrice: item.product.price,
          orderCount: 0
        };
      }
      
      productStats[productId].totalQuantity += item.quantity;
      productStats[productId].totalRevenue += item.price * item.quantity;
      productStats[productId].orderCount += 1;
      
      // Kategori istatistikleri
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = {
          name: categoryName,
          totalQuantity: 0,
          totalRevenue: 0,
          productCount: 0,
          products: new Set()
        };
      }
      
      categoryStats[categoryName].totalQuantity += item.quantity;
      categoryStats[categoryName].totalRevenue += item.price * item.quantity;
      categoryStats[categoryName].products.add(productId);
    });
    
    // Kategori istatistiklerini işle
    const processedCategoryStats = Object.values(categoryStats).map(cat => ({
      name: cat.name,
      totalQuantity: cat.totalQuantity,
      totalRevenue: cat.totalRevenue,
      productCount: cat.products.size
    }));
    
    // En çok satan ürünleri sırala
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);
    
    // Tüm ürün satış verilerini hazırla
    const allProductSales = Object.values(productStats).map(product => ({
      name: product.name,
      category: product.category,
      totalQuantity: product.totalQuantity,
      totalRevenue: product.totalRevenue,
      averagePrice: product.averagePrice,
      orderCount: product.orderCount
    }));
    
    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: today.toISOString(),
      totalProducts: allProductSales.length,
      topProducts,
      productSales: allProductSales,
      categoryStats: processedCategoryStats,
      summary: {
        totalRevenue: allProductSales.reduce((sum, p) => sum + p.totalRevenue, 0),
        totalQuantity: allProductSales.reduce((sum, p) => sum + p.totalQuantity, 0)
      },
      salesRecords: allProductSales.length
    });
    
  } catch (error) {
    console.error('❌ Product sales hatası:', error);
    res.status(500).json({ 
      error: 'Ürün satış istatistikleri getirilemedi',
      details: error.message 
    });
  }
});

// Satış istatistikleri
router.get('/sales-stats', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    console.log(`📊 Sales stats endpoint çağrıldı - period: ${period}`);
    
    let startDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (period) {
      case 'daily':
        startDate = new Date(today);
        break;
      case 'weekly':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(today);
    }
    
    // Satış verilerini getir - hem aktif siparişlerden hem de SalesRecord'dan
    const [activeOrders, salesRecords] = await Promise.all([
      safeDbOperation(() => prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['COMPLETED', 'DELIVERED'] }
        },
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
          orderType: true
        }
      })),
      safeDbOperation(() => prisma.salesRecord.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['COMPLETED', 'DELIVERED'] }
        },
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
          orderType: true
        }
      }))
    ]);

    // İki veri kaynağını birleştir
    const salesData = [...activeOrders, ...salesRecords];
    
    // Günlük satış verilerini grupla
    const dailySales = {};
    salesData.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toISOString().split('T')[0];
      
      if (!dailySales[dateKey]) {
        dailySales[dateKey] = {
          date: dateKey,
          revenue: 0,
          orderCount: 0,
          averageOrderValue: 0
        };
      }
      
      dailySales[dateKey].revenue += order.totalAmount;
      dailySales[dateKey].orderCount += 1;
    });
    
    // Ortalama sipariş değerini hesapla
    Object.values(dailySales).forEach(day => {
      day.averageOrderValue = day.orderCount > 0 ? day.revenue / day.orderCount : 0;
    });
    
    // Sipariş tipine göre analiz
    const orderTypeStats = {};
    salesData.forEach(order => {
      const type = order.orderType || 'UNKNOWN';
      if (!orderTypeStats[type]) {
        orderTypeStats[type] = { count: 0, revenue: 0 };
      }
      orderTypeStats[type].count += 1;
      orderTypeStats[type].revenue += order.totalAmount;
    });
    
    // Toplam istatistikler
    const totalRevenue = salesData.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = salesData.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: today.toISOString(),
      dailySales: Object.values(dailySales),
      orderTypeStats,
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        periodDays: Math.ceil((today - startDate) / (1000 * 60 * 60 * 24))
      }
    });
    
  } catch (error) {
    console.error('❌ Sales stats hatası:', error);
    res.status(500).json({ 
      error: 'Satış istatistikleri getirilemedi',
      details: error.message 
    });
  }
});

// Database stats endpoint'i ekle
router.get('/database-stats', async (req, res) => {
  try {
    console.log('📊 Database stats endpoint çağrıldı');
    
    // Timeout ayarı - 10 saniye
    const timeout = setTimeout(() => {
      console.log('⏰ Database stats timeout - fallback data döndürülüyor');
      return res.json({
        stats: { totalOrders: 0, oldOrders: 0, activeOrders: 0, completedOrders: 0 },
        memory: { rss: 0, heapUsed: 0, heapTotal: 0 },
        timestamp: new Date().toISOString()
      });
    }, 10000);
    
    // İstatistikleri güvenli şekilde al
    const totalOrders = await safeDbOperation(() => prisma.order.count());
    const oldOrders = await safeDbOperation(() => prisma.order.count({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 12 * 60 * 60 * 1000)
        }
      }
    }));
    
    const activeOrders = await safeDbOperation(() => prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'PREPARING', 'READY']
        }
      }
    }));

    const completedOrders = await safeDbOperation(() => prisma.order.count({
      where: {
        status: {
          in: ['DELIVERED', 'CANCELLED']
        }
      }
    }));

    // Bellek kullanımı
    const memUsage = process.memoryUsage();
    
    // Timeout'u temizle
    clearTimeout(timeout);
    
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
    console.error('❌ Database stats hatası:', error);
    res.status(500).json({ error: 'Database istatistikleri alınamadı', details: error.message });
  }
});

module.exports = router; 