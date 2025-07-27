const { PrismaClient } = require('@prisma/client');

// Canlı ortam veritabanı bağlantısı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis?sslmode=require"
    }
  }
});

async function checkUsers() {
  try {
    console.log('🔍 Veritabanındaki kullanıcılar kontrol ediliyor...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    });
    
    console.log('📊 Toplam kullanıcı sayısı:', users.length);
    console.log('\n👥 Kullanıcı Listesi:');
    
    users.forEach(user => {
      console.log(`\n🆔 ID: ${user.id}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Ad: ${user.name}`);
      console.log(`🔑 Rol: ${user.role}`);
      console.log(`✅ Aktif: ${user.isActive}`);
      console.log(`✅ Onaylı: ${user.isApproved}`);
      console.log(`📅 Oluşturulma: ${user.createdAt}`);
    });
    
    // Admin kullanıcılarını kontrol et
    const adminUsers = users.filter(user => user.role === 'SUPER_ADMIN' || user.role === 'BRANCH_MANAGER');
    
    console.log('\n👑 Admin Kullanıcıları:');
    adminUsers.forEach(user => {
      console.log(`\n👑 ${user.role}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Ad: ${user.name}`);
      console.log(`   ✅ Aktif: ${user.isActive}`);
      console.log(`   ✅ Onaylı: ${user.isApproved}`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers(); 