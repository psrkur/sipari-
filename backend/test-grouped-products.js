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

async function testGroupedProducts() {
  try {
    console.log('🧪 Ürün gruplama test ediliyor...\n');

    // 1. Ham verileri al
    console.log('📋 HAM VERİLER:');
    const salesRecordItems = await prisma.salesRecordItem.findMany({
      include: {
        salesRecord: true
      }
    });

    console.log(`Toplam SalesRecordItem sayısı: ${salesRecordItems.length}`);
    salesRecordItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.productName} - ${item.categoryName} - ${item.quantity} adet - ${item.price}₺ (${item.salesRecord.orderNumber})`);
    });
    console.log('');

    // 2. Ürün ismi bazında grupla
    console.log('🔧 GRUPLAMA İŞLEMİ:');
    const productStats = {};
    
    salesRecordItems.forEach(item => {
      const productName = item.productName;
      const categoryName = item.categoryName || 'Kategorisiz';
      
      if (!productStats[productName]) {
        productStats[productName] = {
          name: productName,
          category: categoryName,
          totalQuantity: 0,
          totalRevenue: 0,
          averagePrice: item.price,
          orderCount: 0
        };
      }
      
      productStats[productName].totalQuantity += item.quantity;
      productStats[productName].totalRevenue += item.totalPrice;
      productStats[productName].orderCount += 1;
    });

    // 3. Sonuçları göster
    console.log('📊 GRUPLANMIŞ SONUÇLAR:');
    const sortedProducts = Object.values(productStats).sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    sortedProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Kategori: ${product.category}`);
      console.log(`   Toplam Adet: ${product.totalQuantity}`);
      console.log(`   Toplam Gelir: ${product.totalRevenue}₺`);
      console.log(`   Sipariş Sayısı: ${product.orderCount}`);
      console.log(`   Ortalama Fiyat: ${product.averagePrice}₺`);
      console.log('');
    });

    // 4. Kategori bazında özet
    console.log('📈 KATEGORİ BAZINDA ÖZET:');
    const categoryStats = {};
    
    sortedProducts.forEach(product => {
      const category = product.category;
      if (!categoryStats[category]) {
        categoryStats[category] = {
          name: category,
          totalQuantity: 0,
          totalRevenue: 0,
          productCount: 0,
          products: []
        };
      }
      categoryStats[category].totalQuantity += product.totalQuantity;
      categoryStats[category].totalRevenue += product.totalRevenue;
      categoryStats[category].productCount += 1;
      categoryStats[category].products.push(product.name);
    });

    Object.values(categoryStats).forEach(category => {
      console.log(`${category.name}:`);
      console.log(`  - Toplam Adet: ${category.totalQuantity}`);
      console.log(`  - Toplam Gelir: ${category.totalRevenue}₺`);
      console.log(`  - Ürün Çeşidi: ${category.productCount}`);
      console.log(`  - Ürünler: ${category.products.join(', ')}`);
      console.log('');
    });

    // 5. Karşılaştırma
    console.log('📊 KARŞILAŞTIRMA:');
    console.log(`Ham veri sayısı: ${salesRecordItems.length}`);
    console.log(`Gruplanmış ürün sayısı: ${sortedProducts.length}`);
    console.log(`Azalma oranı: ${Math.round(((salesRecordItems.length - sortedProducts.length) / salesRecordItems.length) * 100)}%`);

  } catch (error) {
    console.error('❌ Test sırasında hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
testGroupedProducts();
