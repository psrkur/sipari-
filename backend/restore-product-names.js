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

async function restoreProductNames() {
  try {
    console.log('🔧 Ürün isimlerini geri yüklüyor...\n');

    // 1. Mevcut ürünleri kontrol et
    console.log('📋 MEVCUT ÜRÜNLER:');
    const products = await prisma.product.findMany({
      include: {
        category: true
      }
    });

    console.log(`Toplam ürün sayısı: ${products.length}`);
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.category.name} - ${product.price}₺`);
    });
    console.log('');

    // 2. SalesRecordItem'ları kontrol et
    console.log('💾 MEVCUT SALES RECORD ITEMS:');
    const salesRecordItems = await prisma.salesRecordItem.findMany({
      include: {
        salesRecord: true
      }
    });

    console.log(`Toplam SalesRecordItem sayısı: ${salesRecordItems.length}`);
    
    // "Silinmiş Sipariş Ürünü" olanları bul
    const deletedProductItems = salesRecordItems.filter(item => 
      item.productName === 'Silinmiş Sipariş Ürünü' || 
      item.productName === 'Bilinmeyen Ürün'
    );

    console.log(`Düzeltilmesi gereken ürün sayısı: ${deletedProductItems.length}`);
    console.log('');

    if (deletedProductItems.length === 0) {
      console.log('✅ Tüm ürün isimleri zaten doğru');
      return;
    }

    // 3. Fiyat ve kategori bazında eşleştirme yap
    console.log('🔍 ÜRÜN EŞLEŞTİRME:');
    
    for (const item of deletedProductItems) {
      console.log(`\n🔧 ${item.salesRecord.orderNumber} siparişi işleniyor...`);
      console.log(`   Mevcut: ${item.productName} - ${item.categoryName} - ${item.price}₺`);

      // Fiyat ve kategori bazında eşleştir
      const matchingProduct = products.find(product => 
        product.price === item.price && 
        product.category.name === item.categoryName
      );

      if (matchingProduct) {
        // Ürün ismini güncelle
        await prisma.salesRecordItem.update({
          where: { id: item.id },
          data: {
            productName: matchingProduct.name,
            categoryName: matchingProduct.category.name,
            productId: matchingProduct.id
          }
        });

        console.log(`   ✅ Güncellendi: ${matchingProduct.name} - ${matchingProduct.category.name} - ${matchingProduct.price}₺`);
      } else {
        // Fiyat bazında eşleştir
        const priceMatch = products.find(product => product.price === item.price);
        
        if (priceMatch) {
          await prisma.salesRecordItem.update({
            where: { id: item.id },
            data: {
              productName: priceMatch.name,
              categoryName: priceMatch.category.name,
              productId: priceMatch.id
            }
          });

          console.log(`   ✅ Fiyat eşleşmesi: ${priceMatch.name} - ${priceMatch.category.name} - ${priceMatch.price}₺`);
        } else {
          // En yakın fiyatlı ürünü bul
          const closestProduct = products.reduce((closest, product) => {
            const diff = Math.abs(product.price - item.price);
            const closestDiff = Math.abs(closest.price - item.price);
            return diff < closestDiff ? product : closest;
          });

          await prisma.salesRecordItem.update({
            where: { id: item.id },
            data: {
              productName: closestProduct.name,
              categoryName: closestProduct.category.name,
              productId: closestProduct.id
            }
          });

          console.log(`   ✅ En yakın fiyat: ${closestProduct.name} - ${closestProduct.category.name} - ${closestProduct.price}₺ (Orijinal: ${item.price}₺)`);
        }
      }
    }

    // 4. Sonuçları kontrol et
    console.log('\n📊 GÜNCELLEME SONUÇLARI:');
    const updatedItems = await prisma.salesRecordItem.findMany({
      include: {
        salesRecord: true
      }
    });

    console.log('Güncellenmiş ürün satışları:');
    updatedItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName} - ${item.categoryName} - ${item.quantity} adet - ${item.price}₺ (${item.salesRecord.orderNumber})`);
    });

    // 5. Kategori bazında özet
    const categorySummary = {};
    updatedItems.forEach(item => {
      if (!categorySummary[item.categoryName]) {
        categorySummary[item.categoryName] = {
          totalQuantity: 0,
          totalRevenue: 0,
          products: new Set()
        };
      }
      categorySummary[item.categoryName].totalQuantity += item.quantity;
      categorySummary[item.categoryName].totalRevenue += item.totalPrice;
      categorySummary[item.categoryName].products.add(item.productName);
    });

    console.log('\n📈 KATEGORİ BAZINDA ÖZET:');
    Object.entries(categorySummary).forEach(([category, stats]) => {
      console.log(`${category}:`);
      console.log(`  - Toplam adet: ${stats.totalQuantity}`);
      console.log(`  - Toplam gelir: ${stats.totalRevenue}₺`);
      console.log(`  - Ürün çeşidi: ${stats.products.size}`);
      console.log(`  - Ürünler: ${Array.from(stats.products).join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Güncelleme sırasında hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
restoreProductNames();
