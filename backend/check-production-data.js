const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
    }
  }
});

async function checkProductionData() {
  try {
    console.log('🔍 Production veritabanı kontrol ediliyor...\n');

    // 1. Users tablosu
    console.log('1. Users tablosu:');
    const users = await prisma.user.findMany();
    console.log(`   - Toplam kullanıcı: ${users.length}`);
    if (users.length > 0) {
      console.log('   - Kullanıcılar:');
      users.forEach(user => {
        console.log(`     * ${user.name} (${user.email}) - ${user.role}`);
      });
    }

    // 2. Companies tablosu
    console.log('\n2. Companies tablosu:');
    const companies = await prisma.company.findMany();
    console.log(`   - Toplam şirket: ${companies.length}`);
    if (companies.length > 0) {
      console.log('   - Şirketler:');
      companies.forEach(company => {
        console.log(`     * ${company.name} (${company.domain})`);
      });
    }

    // 3. Branches tablosu
    console.log('\n3. Branches tablosu:');
    try {
      const branches = await prisma.$queryRaw`
        SELECT * FROM branches LIMIT 10
      `;
      console.log(`   - Toplam şube: ${branches.length}`);
      if (branches.length > 0) {
        console.log('   - Şubeler:');
        branches.forEach(branch => {
          console.log(`     * ${branch.name} - ${branch.address}`);
        });
      }
    } catch (error) {
      console.log('   - Branches hatası:', error.message);
    }

    // 4. Categories tablosu
    console.log('\n4. Categories tablosu:');
    try {
      const categories = await prisma.category.findMany();
      console.log(`   - Toplam kategori: ${categories.length}`);
      if (categories.length > 0) {
        console.log('   - Kategoriler:');
        categories.forEach(category => {
          console.log(`     * ${category.name}`);
        });
      }
    } catch (error) {
      console.log('   - Categories hatası:', error.message);
    }

    // 5. Products tablosu
    console.log('\n5. Products tablosu:');
    try {
      const products = await prisma.product.findMany();
      console.log(`   - Toplam ürün: ${products.length}`);
      if (products.length > 0) {
        console.log('   - İlk 10 ürün:');
        products.slice(0, 10).forEach(product => {
          console.log(`     * ${product.name} - ₺${product.price}`);
        });
      }
    } catch (error) {
      console.log('   - Products hatası:', error.message);
    }

    // 6. Franchises tablosu
    console.log('\n6. Franchises tablosu:');
    try {
      const franchises = await prisma.franchise.findMany();
      console.log(`   - Toplam franchise: ${franchises.length}`);
      if (franchises.length > 0) {
        console.log('   - Franchise\'lar:');
        franchises.forEach(franchise => {
          console.log(`     * ${franchise.name} (${franchise.code}) - ${franchise.ownerName}`);
        });
      }
    } catch (error) {
      console.log('   - Franchises hatası:', error.message);
    }

    // 7. Orders tablosu
    console.log('\n7. Orders tablosu:');
    try {
      const orders = await prisma.order.findMany();
      console.log(`   - Toplam sipariş: ${orders.length}`);
      if (orders.length > 0) {
        console.log('   - İlk 10 sipariş:');
        orders.slice(0, 10).forEach(order => {
          console.log(`     * ${order.orderNumber} - ₺${order.totalAmount} - ${order.status}`);
        });
      }
    } catch (error) {
      console.log('   - Orders hatası:', error.message);
    }

    // 8. Tüm tabloları kontrol et
    console.log('\n8. Tüm tablolar:');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      console.log('   - Mevcut tablolar:');
      tables.forEach(table => {
        console.log(`     * ${table.table_name}`);
      });
    } catch (error) {
      console.log('   - Tablo listesi hatası:', error.message);
    }

    console.log('\n📊 ÖZET:');
    console.log(`   - Kullanıcılar: ${users.length}`);
    console.log(`   - Şirketler: ${companies.length}`);
    console.log(`   - Franchise'lar: ${franchises?.length || 0}`);
    console.log(`   - Siparişler: ${orders?.length || 0}`);
    console.log(`   - Ürünler: ${products?.length || 0}`);

    if (users.length === 0 && products.length === 0) {
      console.log('\n⚠️  UYARI: Production veritabanında hiç veri yok!');
    }

  } catch (error) {
    console.error('❌ Genel hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductionData(); 