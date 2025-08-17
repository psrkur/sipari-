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

async function fixSalesRecords() {
  try {
    console.log('🔧 SalesRecord verilerini düzeltiliyor...\n');

    // 1. Ürün detayı olmayan SalesRecord'ları bul
    const salesRecordsWithoutItems = await prisma.salesRecord.findMany({
      where: {
        salesRecordItems: {
          none: {}
        }
      },
      include: {
        salesRecordItems: true
      }
    });

    console.log(`📋 Ürün detayı olmayan SalesRecord sayısı: ${salesRecordsWithoutItems.length}`);

    if (salesRecordsWithoutItems.length === 0) {
      console.log('✅ Tüm SalesRecord\'lar zaten ürün detaylarına sahip');
      return;
    }

    // 2. Her SalesRecord için ürün detaylarını oluştur
    for (const salesRecord of salesRecordsWithoutItems) {
      console.log(`🔧 SalesRecord #${salesRecord.orderNumber} işleniyor...`);

      // Eğer orderId varsa, o siparişin ürünlerini al
      if (salesRecord.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: salesRecord.orderId },
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

        if (order && order.orderItems.length > 0) {
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

          await prisma.salesRecordItem.createMany({
            data: salesRecordItems
          });

          console.log(`  ✅ ${salesRecordItems.length} ürün detayı eklendi`);
        } else {
          console.log(`  ⚠️ Sipariş bulunamadı veya ürün yok`);
        }
      } else {
        // orderId yoksa, varsayılan ürün detayı oluştur
        const defaultItem = {
          salesRecordId: salesRecord.id,
          productId: 1, // Varsayılan ürün ID
          productName: 'Bilinmeyen Ürün',
          categoryName: 'Diğer',
          quantity: 1,
          price: salesRecord.totalAmount,
          totalPrice: salesRecord.totalAmount
        };

        await prisma.salesRecordItem.create({
          data: defaultItem
        });

        console.log(`  ✅ Varsayılan ürün detayı eklendi`);
      }
    }

    // Sipariş bulunamayan SalesRecord'lar için de varsayılan detay ekle
    for (const salesRecord of salesRecordsWithoutItems) {
      if (salesRecord.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: salesRecord.orderId }
        });

        if (!order) {
          // Sipariş silinmiş, varsayılan detay ekle
          const defaultItem = {
            salesRecordId: salesRecord.id,
            productId: 1,
            productName: 'Silinmiş Sipariş Ürünü',
            categoryName: 'Diğer',
            quantity: 1,
            price: salesRecord.totalAmount,
            totalPrice: salesRecord.totalAmount
          };

          await prisma.salesRecordItem.create({
            data: defaultItem
          });

          console.log(`  ✅ Silinmiş sipariş için varsayılan detay eklendi`);
        }
      }
    }

    // 3. Sonuçları kontrol et
    const finalCheck = await prisma.salesRecord.findMany({
      include: {
        salesRecordItems: true
      }
    });

    console.log('\n📊 DÜZELTME SONUÇLARI:');
    console.log(`Toplam SalesRecord: ${finalCheck.length}`);
    console.log(`Ürün detayı olan SalesRecord: ${finalCheck.filter(r => r.salesRecordItems.length > 0).length}`);
    console.log(`Toplam SalesRecordItem: ${finalCheck.reduce((sum, r) => sum + r.salesRecordItems.length, 0)}`);

    // 4. Örnek verileri göster
    console.log('\n📋 ÖRNEK VERİLER:');
    const sampleRecords = finalCheck.slice(0, 3);
    sampleRecords.forEach((record, index) => {
      console.log(`${index + 1}. #${record.orderNumber} - ${record.totalAmount}₺`);
      record.salesRecordItems.forEach(item => {
        console.log(`   - ${item.productName} (${item.quantity} adet) - ${item.price}₺`);
      });
    });

  } catch (error) {
    console.error('❌ Düzeltme sırasında hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
fixSalesRecords();
