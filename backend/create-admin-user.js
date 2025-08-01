const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// DATABASE_URL'yi server.js'den al
const DATABASE_URL = 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function createAdminUser() {
  try {
    // Admin kullanıcısı bilgileri
    const adminData = {
      name: 'Admin User',
      email: 'admin@yemek5.com',
      phone: '+905551234567',
      password: 'admin123', // Bu şifreyi değiştirin
      role: 'admin',
      isActive: true
    };

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Kullanıcıyı oluştur
    const adminUser = await prisma.user.create({
      data: {
        name: adminData.name,
        email: adminData.email,
        phone: adminData.phone,
        password: hashedPassword,
        role: adminData.role,
        isActive: adminData.isActive
      }
    });

    console.log('✅ Admin kullanıcısı başarıyla oluşturuldu:');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Şifre:', adminData.password);
    console.log('👤 Kullanıcı ID:', adminUser.id);
    console.log('🎭 Rol:', adminUser.role);

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ Bu email adresi zaten kullanımda. Admin kullanıcısı zaten mevcut.');
    } else {
      console.error('❌ Admin kullanıcısı oluşturulurken hata:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser(); 