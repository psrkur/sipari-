const { PrismaClient } = require('@prisma/client');

// Environment variables - Manuel yükleme
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const DATABASE_URL = 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';

// Prisma client configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  log: ['error', 'warn']
});

async function testSalesData() {
  try {
    console.log('🧪 Satış verileri test ediliyor...\n');

    // 1. Genel istatistikler
    console.log('📊 GENEL İSTATİSTİKLER:');
    const [ordersCount, orderItemsCount, salesRecordsCount, salesRecordItemsCount] = await Promise.all([
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.salesRecord.count(),
      prisma.salesRecordItem.count()
    ]);

    console.log(`📋 Toplam sipariş: ${ordersCount}`);
    console.log(`🛍️ Toplam sipariş ürünü: ${orderItemsCount}`);
    console.log(`💾 Toplam satış kaydı: ${salesRecordsCount}`);
    console.log(`📦 Toplam arşiv ürün: ${salesRecordItemsCount}\n`);

    // 2. Son 5 aktif sipariş
    console.log('🔄 SON 5 AKTİF SİPARİŞ:');
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. #${order.orderNumber} - ${order.status} - ${order.totalAmount}₺`);
      console.log(`   Ürünler: ${order.orderItems.map(item => `${item.product.name} (${item.quantity} adet)`).join(', ')}`);
    });
    console.log('');

    // 3. Son 5 arşiv kaydı
    console.log('💾 SON 5 ARŞİV KAYDI:');
    const recentSalesRecords = await prisma.salesRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        salesRecordItems: true
      }
    });

    recentSalesRecords.forEach((record, index) => {
      console.log(`${index + 1}. #${record.orderNumber} - ${record.status} - ${record.totalAmount}₺`);
      console.log(`   Ürünler: ${record.salesRecordItems.map(item => `${item.productName} (${item.quantity} adet)`).join(', ')}`);
    });
    console.log('');

    // 4. Tamamlanmış siparişler
    console.log('✅ TAMAMLANMIŞ SİPARİŞLER:');
    const completedOrders = await prisma.order.count({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] }
      }
    });
    console.log(`Aktif tamamlanmış sipariş: ${completedOrders}`);

    const completedSalesRecords = await prisma.salesRecord.count({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] }
      }
    });
    console.log(`Arşiv tamamlanmış sipariş: ${completedSalesRecords}\n`);

    // 5. Ürün satış verileri test
    console.log('🛍️ ÜRÜN SATIŞ VERİLERİ TEST:');
    
    // Aktif siparişlerden ürün verileri
    const activeProductSales = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: ['COMPLETED', 'DELIVERED'] }
        }
      },
      include: {
        product: {
          include: {
            category: true
          }
        }
      },
      take: 5
    });

    console.log('Aktif siparişlerden ürün verileri:');
    activeProductSales.forEach((item, index) => {
      console.log(`${index + 1}. ${item.product.name} - ${item.product.category.name} - ${item.quantity} adet - ${item.price}₺`);
    });
    console.log('');

    // Arşivden ürün verileri
    const archivedProductSales = await prisma.salesRecordItem.findMany({
      where: {
        salesRecord: {
          status: { in: ['COMPLETED', 'DELIVERED'] }
        }
      },
      take: 5
    });

    console.log('Arşivden ürün verileri:');
    archivedProductSales.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName} - ${item.categoryName} - ${item.quantity} adet - ${item.price}₺`);
    });
    console.log('');

    // 6. API endpoint test
    console.log('🌐 API ENDPOINT TEST:');
    console.log('Product-sales endpoint\'ini test etmek için:');
    console.log('GET /api/dashboard/product-sales?period=daily');
    console.log('GET /api/admin/product-sales?period=daily');

  } catch (error) {
    console.error('❌ Test sırasında hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
testSalesData();
