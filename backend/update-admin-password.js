const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis?sslmode=require"
    }
  }
});

async function updateAdminPassword() {
  try {
    console.log('🔍 Admin kullanıcısının şifresi güncelleniyor...');
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Admin kullanıcısını güncelle
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@yemek5.com' },
      data: {
        password: hashedPassword,
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('✅ Admin kullanıcısı güncellendi:');
    console.log(`📧 Email: ${updatedUser.email}`);
    console.log(`👤 Ad: ${updatedUser.name}`);
    console.log(`🔑 Rol: ${updatedUser.role}`);
    console.log(`✅ Aktif: ${updatedUser.isActive}`);
    console.log(`✅ Onaylı: ${updatedUser.isApproved}`);
    console.log('\n🔑 Yeni giriş bilgileri:');
    console.log('Email: admin@yemek5.com');
    console.log('Şifre: admin123');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword(); 