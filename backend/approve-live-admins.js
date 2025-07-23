const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Canlı ortam veritabanı bağlantısı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

async function approveLiveAdmins() {
  try {
    console.log('🔐 Canlı ortamda admin kullanıcıları onaylanıyor...');
    console.log('🌐 Environment: PRODUCTION');
    
    // Mevcut kullanıcıları kontrol et
    const existingUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('📊 Mevcut kullanıcı sayısı:', existingUsers.length);
    
    // Varsayılan şirketi ekle (id=1)
    const existingCompany = await prisma.company.findUnique({ where: { id: 1 } });
    if (!existingCompany) {
      await prisma.company.create({
        data: {
          id: 1,
          name: 'Varsayılan Şirket',
          domain: 'tekfirma',
          isActive: true
        }
      });
      console.log('✅ Varsayılan şirket eklendi (id=1)');
    } else {
      console.log('ℹ️ Varsayılan şirket zaten mevcut (id=1)');
    }
    
    // Süper admin hesabını onayla/oluştur
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const superAdmin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        isActive: true,
        isApproved: true,
        password: hashedPassword,
        name: 'Süper Admin',
        role: 'SUPER_ADMIN'
      },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Süper Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('✅ Süper admin onaylandı:', superAdmin.email);
    
    // Şube müdürü hesabını onayla/oluştur
    const managerPassword = await bcrypt.hash('manager123', 10);
    
    const manager = await prisma.user.upsert({
      where: { email: 'manager@example.com' },
      update: {
        isActive: true,
        isApproved: true,
        password: managerPassword,
        name: 'Merkez Şube Müdürü',
        role: 'BRANCH_MANAGER',
        branchId: 1
      },
      create: {
        email: 'manager@example.com',
        password: managerPassword,
        name: 'Merkez Şube Müdürü',
        role: 'BRANCH_MANAGER',
        branchId: 1,
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('✅ Şube müdürü onaylandı:', manager.email);
    
    // Tüm admin kullanıcılarını listele
    const adminUsers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'SUPER_ADMIN' },
          { role: 'BRANCH_MANAGER' }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isApproved: true
      }
    });
    
    console.log('\n👑 Canlı Ortamda Onaylanan Admin Kullanıcıları:');
    adminUsers.forEach(user => {
      console.log(`\n👑 ${user.role}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Ad: ${user.name}`);
      console.log(`   ✅ Aktif: ${user.isActive}`);
      console.log(`   ✅ Onaylı: ${user.isApproved}`);
    });
    
    console.log('\n🎉 Canlı ortamda admin hesapları başarıyla onaylandı!');
    console.log('\n📋 Giriş Bilgileri:');
    console.log('👑 Süper Admin: admin@example.com / admin123');
    console.log('🏢 Şube Müdürü: manager@example.com / manager123');
    console.log('\n🌐 Canlı Site: https://yemek5-frontend.onrender.com');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveLiveAdmins(); 