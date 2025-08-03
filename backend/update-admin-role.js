const { PrismaClient } = require('@prisma/client');

// DATABASE_URL'yi server.js'den al
const DATABASE_URL = 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function updateAdminRole() {
  try {
    // Admin kullanıcısını bul ve rolünü güncelle
    const updatedUser = await prisma.user.update({
      where: {
        email: 'admin@yemek5.com'
      },
      data: {
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Admin kullanıcısının rolü başarıyla güncellendi:');
    console.log('📧 Email:', updatedUser.email);
    console.log('👤 Ad:', updatedUser.name);
    console.log('🎭 Yeni Rol:', updatedUser.role);

  } catch (error) {
    console.error('❌ Admin rolü güncellenirken hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminRole(); 