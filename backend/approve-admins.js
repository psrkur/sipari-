const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function approveAdmins() {
  try {
    console.log('🔐 Admin kullanıcıları onaylanıyor...');
    
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
    
    console.log('\n👑 Onaylanan Admin Kullanıcıları:');
    adminUsers.forEach(user => {
      console.log(`\n👑 ${user.role}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Ad: ${user.name}`);
      console.log(`   ✅ Aktif: ${user.isActive}`);
      console.log(`   ✅ Onaylı: ${user.isApproved}`);
    });
    
    console.log('\n🎉 Admin hesapları başarıyla onaylandı!');
    console.log('\n📋 Giriş Bilgileri:');
    console.log('👑 Süper Admin: admin@example.com / admin123');
    console.log('🏢 Şube Müdürü: manager@example.com / manager123');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveAdmins(); 