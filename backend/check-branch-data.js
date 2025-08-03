const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
    }
  }
});

async function checkBranchData(branchId = 6) {
  try {
    console.log(`🔍 Şube ID ${branchId} için veri kontrolü yapılıyor...\n`);

    // Şubeye bağlı siparişler
    const ordersCount = await prisma.order.count({
      where: { branchId: parseInt(branchId) }
    });
    console.log(`📦 Sipariş sayısı: ${ordersCount}`);

    if (ordersCount > 0) {
      const orders = await prisma.order.findMany({
        where: { branchId: parseInt(branchId) },
        select: { id: true, orderNumber: true, status: true, createdAt: true }
      });
      console.log('📋 Siparişler:', orders);
    }

    // Şubeye bağlı ürünler
    const productsCount = await prisma.product.count({
      where: { branchId: parseInt(branchId) }
    });
    console.log(`🛍️ Ürün sayısı: ${productsCount}`);

    if (productsCount > 0) {
      const products = await prisma.product.findMany({
        where: { branchId: parseInt(branchId) },
        select: { id: true, name: true, price: true, isActive: true }
      });
      console.log('📦 Ürünler:', products);
    }

    // Şubeye bağlı kullanıcılar
    const usersCount = await prisma.user.count({
      where: { branchId: parseInt(branchId) }
    });
    console.log(`👥 Kullanıcı sayısı: ${usersCount}`);

    if (usersCount > 0) {
      const users = await prisma.user.findMany({
        where: { branchId: parseInt(branchId) },
        select: { id: true, name: true, email: true, role: true }
      });
      console.log('👤 Kullanıcılar:', users);
    }

    // Şubeye bağlı masalar
    const tablesCount = await prisma.table.count({
      where: { branchId: parseInt(branchId) }
    });
    console.log(`🪑 Masa sayısı: ${tablesCount}`);

    if (tablesCount > 0) {
      const tables = await prisma.table.findMany({
        where: { branchId: parseInt(branchId) },
        select: { id: true, name: true, isActive: true }
      });
      console.log('🪑 Masalar:', tables);
    }

    console.log('\n📊 ÖZET:');
    console.log(`- Siparişler: ${ordersCount}`);
    console.log(`- Ürünler: ${productsCount}`);
    console.log(`- Kullanıcılar: ${usersCount}`);
    console.log(`- Masalar: ${tablesCount}`);

    if (ordersCount > 0 || productsCount > 0 || usersCount > 0) {
      console.log('\n❌ Bu şube silinemez çünkü bağlı veriler var!');
      console.log('💡 Çözüm önerileri:');
      console.log('1. Önce bağlı verileri silin');
      console.log('2. Veya şubeyi pasif hale getirin (isActive: false)');
    } else {
      console.log('\n✅ Bu şube güvenle silinebilir!');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
checkBranchData(6); 