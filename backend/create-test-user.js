const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis?sslmode=require"
    }
  }
});

async function createTestUser() {
  try {
    console.log('🔍 Test kullanıcısı oluşturuluyor...');
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Test kullanıcısını oluştur
    const testUser = await prisma.user.create({
      data: {
        email: 'test@yemek5.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'CUSTOMER',
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('✅ Test kullanıcısı oluşturuldu:');
    console.log(`📧 Email: ${testUser.email}`);
    console.log(`👤 Ad: ${testUser.name}`);
    console.log(`🔑 Rol: ${testUser.role}`);
    console.log(`✅ Aktif: ${testUser.isActive}`);
    console.log(`✅ Onaylı: ${testUser.isApproved}`);
    console.log('\n🔑 Giriş bilgileri:');
    console.log('Email: test@yemek5.com');
    console.log('Şifre: test123');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 