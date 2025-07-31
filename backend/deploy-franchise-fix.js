const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

console.log('🚀 Franchise fix deployment başlıyor...');

try {
  // 1. Prisma client'ı yeniden generate et
  console.log('1. Prisma client yeniden generate ediliyor...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 2. Veritabanı bağlantısını test et
  console.log('2. Veritabanı bağlantısı test ediliyor...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
      }
    }
  });
  
  // 3. Franchise tablosunu test et
  console.log('3. Franchise tablosu test ediliyor...');
  const franchises = await prisma.franchise.findMany({
    take: 1
  });
  
  console.log('✅ Franchise tablosu çalışıyor! Bulunan franchise sayısı:', franchises.length);
  
  if (franchises.length > 0) {
    console.log('İlk franchise:', {
      id: franchises[0].id,
      name: franchises[0].name,
      code: franchises[0].code,
      ownerName: franchises[0].ownerName
    });
  }
  
  await prisma.$disconnect();
  
  console.log('✅ Franchise fix deployment tamamlandı!');
  
} catch (error) {
  console.error('❌ Hata:', error);
  process.exit(1);
} 