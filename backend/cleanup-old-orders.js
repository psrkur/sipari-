const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');

// Environment variables - Manuel yükleme
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const DATABASE_URL = 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';

// Prisma client configuration - server.js ile aynı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  },
  log: ['error', 'warn'],
  __internal: {
    engine: {
      connectTimeout: 15000,
      pool: {
        min: 1,
        max: 5
      }
    }
  }
});

// 12 saat öncesini hesapla
const TWELVE_HOURS_AGO = new Date(Date.now() - 12 * 60 * 60 * 1000);

/**
 * Eski siparişleri temizle
 * 12 saatten eski siparişleri ve ilgili orderItems'ları siler
 */
async function cleanupOldOrders() {
  try {
    console.log('🧹 Eski siparişler temizleniyor...');
    console.log('⏰ 12 saat öncesi:', TWELVE_HOURS_AGO.toISOString());

    // Önce silinecek siparişleri say
    const ordersToDelete = await prisma.order.findMany({
      where: {
        createdAt: {
          lt: TWELVE_HOURS_AGO
        },
        status: {
          in: ['DELIVERED', 'CANCELLED'] // Sadece tamamlanmış veya iptal edilmiş siparişler
        }
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true
      }
    });

    console.log(`📊 Silinecek sipariş sayısı: ${ordersToDelete.length}`);

    if (ordersToDelete.length === 0) {
      console.log('✅ Silinecek eski sipariş bulunmuyor');
      return;
    }

    // Silinecek siparişleri göster
    console.log('🗑️ Silinecek siparişler:');
    ordersToDelete.forEach(order => {
      console.log(`  - #${order.orderNumber} (${order.status}) - ${order.createdAt}`);
    });

    // Transaction ile güvenli silme işlemi
    const result = await prisma.$transaction(async (tx) => {
      // Önce silinecek siparişlerin detaylarını al (ürün detayları dahil)
      const ordersWithDetails = await tx.order.findMany({
        where: {
          id: {
            in: ordersToDelete.map(order => order.id)
          }
        },
        include: {
          customer: true,
          branch: true,
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

      // SalesRecord ve SalesRecordItem'ları oluştur
      for (const order of ordersWithDetails) {
        // SalesRecord oluştur
        const salesRecord = await tx.salesRecord.create({
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            branchId: order.branchId,
            customerId: order.customerId,
            totalAmount: order.totalAmount,
            orderType: order.orderType,
            platform: order.platform,
            platformOrderId: order.platformOrderId,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
          }
        });

        // SalesRecordItem'ları oluştur
        const salesRecordItems = order.orderItems.map(item => ({
          salesRecordId: salesRecord.id,
          productId: item.productId,
          productName: item.product.name,
          categoryName: item.product.category.name,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.price * item.quantity
        }));

        if (salesRecordItems.length > 0) {
          await tx.salesRecordItem.createMany({
            data: salesRecordItems
          });
        }
      }

      console.log(`💾 ${ordersWithDetails.length} sipariş ve ürün detayları SalesRecord tablosuna kaydedildi`);

      // Önce orderItems'ları sil
      const orderIds = ordersToDelete.map(order => order.id);
      
      const deletedOrderItems = await tx.orderItem.deleteMany({
        where: {
          orderId: {
            in: orderIds
          }
        }
      });

      console.log(`🗑️ Silinen orderItems sayısı: ${deletedOrderItems.count}`);

      // Sonra siparişleri sil
      const deletedOrders = await tx.order.deleteMany({
        where: {
          id: {
            in: orderIds
          }
        }
      });

      console.log(`🗑️ Silinen sipariş sayısı: ${deletedOrders.count}`);

      return {
        deletedOrders: deletedOrders.count,
        deletedOrderItems: deletedOrderItems.count,
        savedSalesRecords: salesRecords.length
      };
    });

    console.log('✅ Eski siparişler başarıyla temizlendi!');
    console.log(`📊 Toplam silinen sipariş: ${result.deletedOrders}`);
    console.log(`📊 Toplam silinen orderItems: ${result.deletedOrderItems}`);

    // Log dosyasına kaydet
    logger.info(`Eski siparişler temizlendi: ${result.deletedOrders} sipariş, ${result.deletedOrderItems} orderItems`);

  } catch (error) {
    console.error('❌ Eski siparişler temizlenirken hata oluştu:', error);
    logger.error('Eski siparişler temizlenirken hata:', error);
    throw error;
  }
}

/**
 * Veritabanı istatistiklerini göster
 */
async function showDatabaseStats() {
  try {
    console.log('📊 Veritabanı İstatistikleri:');
    
    const totalOrders = await prisma.order.count();
    const oldOrders = await prisma.order.count({
      where: {
        createdAt: {
          lt: TWELVE_HOURS_AGO
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

    console.log(`📋 Toplam sipariş: ${totalOrders}`);
    console.log(`⏰ 12 saatten eski sipariş: ${oldOrders}`);
    console.log(`🔄 Aktif sipariş: ${activeOrders}`);
    console.log(`✅ Tamamlanmış sipariş: ${completedOrders}`);

    // Bellek kullanımı
    const memUsage = process.memoryUsage();
    console.log('💾 Bellek Kullanımı:');
    console.log(`  - RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
    console.log(`  - Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
    console.log(`  - Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);

  } catch (error) {
    console.error('❌ İstatistikler alınırken hata:', error);
  }
}

/**
 * Manuel temizlik işlemi
 */
async function manualCleanup() {
  try {
    console.log('🧹 Manuel temizlik başlatılıyor...');
    
    await showDatabaseStats();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await cleanupOldOrders();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await showDatabaseStats();
    
    console.log('✅ Manuel temizlik tamamlandı!');
  } catch (error) {
    console.error('❌ Manuel temizlik hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Otomatik temizlik için interval
 */
function startAutoCleanup() {
  console.log('🔄 Otomatik temizlik başlatılıyor...');
  console.log('⏰ Her 6 saatte bir çalışacak');
  
  // İlk çalıştırma
  cleanupOldOrders().catch(console.error);
  
  // 6 saatte bir çalıştır (6 * 60 * 60 * 1000 ms)
  setInterval(async () => {
    try {
      await cleanupOldOrders();
    } catch (error) {
      console.error('❌ Otomatik temizlik hatası:', error);
    }
  }, 6 * 60 * 60 * 1000);
}

// Eğer bu dosya direkt çalıştırılırsa
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--auto')) {
    console.log('🔄 Otomatik temizlik modu başlatılıyor...');
    startAutoCleanup();
  } else if (args.includes('--stats')) {
    console.log('📊 Sadece istatistikler gösteriliyor...');
    showDatabaseStats().then(() => prisma.$disconnect());
  } else {
    console.log('🧹 Manuel temizlik modu başlatılıyor...');
    manualCleanup();
  }
}

module.exports = {
  cleanupOldOrders,
  showDatabaseStats,
  startAutoCleanup
}; 