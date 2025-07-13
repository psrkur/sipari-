// Veritabanı Test Script'i
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});

async function testConnection() {
  console.log('🔍 Veritabanı bağlantısı test ediliyor...');
  console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Ayarlandı' : '❌ Ayarlandı');
  
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL bağlantısı başarılı');
    
    // Tablo sayılarını kontrol et
    const userCount = await prisma.user.count();
    const branchCount = await prisma.branch.count();
    const categoryCount = await prisma.category.count();
    const productCount = await prisma.product.count();
    
    console.log('📊 Veritabanı Durumu:');
    console.log(`   👥 Kullanıcılar: ${userCount}`);
    console.log(`   🏪 Şubeler: ${branchCount}`);
    console.log(`   📂 Kategoriler: ${categoryCount}`);
    console.log(`   🍕 Ürünler: ${productCount}`);
    
    if (userCount === 0) {
      console.log('⚠️ Veritabanı boş - seed data gerekli');
    } else {
      console.log('✅ Veritabanında veri mevcut');
    }
    
    // Örnek kullanıcı kontrolü
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (adminUser) {
      console.log('👑 Admin kullanıcısı mevcut');
    } else {
      console.log('⚠️ Admin kullanıcısı bulunamadı');
    }
    
  } catch (error) {
    console.error('❌ Bağlantı hatası:', error.message);
    
    if (error.code === 'P1001') {
      console.log('💡 Çözüm: DATABASE_URL environment variable\'ını kontrol edin');
    } else if (error.code === 'P2021') {
      console.log('💡 Çözüm: Tablolar henüz oluşturulmamış');
    } else if (error.code === 'P2002') {
      console.log('💡 Çözüm: Unique constraint hatası');
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Bağlantı kapatıldı');
  }
}

// Script'i çalıştır
testConnection(); 