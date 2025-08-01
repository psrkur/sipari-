const { PrismaClient } = require('@prisma/client');
const { performanceMonitor } = require('./performance-monitor');
const { memoryOptimizer } = require('./memory-optimization');

const prisma = new PrismaClient();

async function testOptimizations() {
  console.log('🧪 Optimizasyon testleri başlatılıyor...');
  
  try {
    // Test 1: Ürün listesi performansı
    console.log('\n📊 Test 1: Ürün listesi performansı');
    
    const startTime = Date.now();
    const products = await performanceMonitor.monitorQuery('get_products', async () => {
      return await prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    });
    
    console.log(`✅ ${products.length} ürün ${Date.now() - startTime}ms'de getirildi`);
    
    // Test 2: Sipariş listesi performansı
    console.log('\n📊 Test 2: Sipariş listesi performansı');
    
    const ordersStart = Date.now();
    const orders = await performanceMonitor.monitorQuery('get_orders', async () => {
      return await prisma.order.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Son 7 gün
          }
        },
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
              product: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        take: 100 // Limit ekle
      });
    });
    
    console.log(`✅ ${orders.length} sipariş ${Date.now() - ordersStart}ms'de getirildi`);
    
    // Test 3: Cache performansı
    console.log('\n📊 Test 3: Cache performansı');
    
    const cacheKey = 'test_categories';
    const categories1 = await memoryOptimizer.cachedQuery(cacheKey, async () => {
      return await prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true
        }
      });
    });
    
    const categories2 = await memoryOptimizer.cachedQuery(cacheKey, async () => {
      return await prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true
        }
      });
    });
    
    console.log(`✅ Cache testi: ${categories1.length} kategori, ikinci çağrı cache'den geldi`);
    
    // Test 4: Bellek kullanımı
    console.log('\n📊 Test 4: Bellek kullanımı');
    
    const memoryUsage = memoryOptimizer.getMemoryUsage();
    console.log(`💾 Bellek Kullanımı: ${memoryUsage.heapUsed}MB / ${memoryUsage.heapTotal}MB`);
    console.log(`📈 RSS: ${memoryUsage.rss}MB`);
    
    // Test 5: Batch işlem performansı
    console.log('\n📊 Test 5: Batch işlem performansı');
    
    const batchStart = Date.now();
    const batchProducts = await memoryOptimizer.batchQuery(
      'product',
      { isActive: true },
      {
        id: true,
        name: true,
        price: true
      },
      50 // Batch boyutu
    );
    
    console.log(`✅ ${batchProducts.length} ürün batch işlemi ${Date.now() - batchStart}ms'de tamamlandı`);
    
    // Test 6: Performans raporu
    console.log('\n📊 Test 6: Performans raporu');
    
    const report = performanceMonitor.generateReport();
    console.log('📈 Performans Özeti:');
    console.log(`  - Toplam Sorgu: ${report.summary.totalQueries}`);
    console.log(`  - Ortalama Süre: ${report.summary.averageDuration.toFixed(2)}ms`);
    console.log(`  - Toplam Hata: ${report.summary.totalErrors}`);
    console.log(`  - Yavaş Sorgu: ${report.summary.slowQueries}`);
    
    // En yavaş sorguları göster
    const slowestQueries = performanceMonitor.getSlowestQueries(3);
    if (slowestQueries.length > 0) {
      console.log('\n🐌 En Yavaş Sorgular:');
      slowestQueries.forEach((query, index) => {
        console.log(`  ${index + 1}. ${query.name}: ${query.duration.toFixed(2)}ms`);
      });
    }
    
    // En çok kullanılan sorguları göster
    const mostUsedQueries = performanceMonitor.getMostUsedQueries(3);
    if (mostUsedQueries.length > 0) {
      console.log('\n🔥 En Çok Kullanılan Sorgular:');
      mostUsedQueries.forEach((query, index) => {
        console.log(`  ${index + 1}. ${query.name}: ${query.count} kez (${query.averageDuration.toFixed(2)}ms ort.)`);
      });
    }
    
    // Önerileri göster
    if (report.recommendations.length > 0) {
      console.log('\n💡 Öneriler:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.message}`);
      });
    }
    
    console.log('\n✅ Tüm optimizasyon testleri tamamlandı!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await prisma.$disconnect();
    await memoryOptimizer.disconnect();
  }
}

// Script çalıştır
if (require.main === module) {
  testOptimizations();
}

module.exports = { testOptimizations }; 