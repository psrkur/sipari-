const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔧 Migration başlatılıyor...');
    
    // Migration'ı uygula
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    console.log('✅ Migration başarıyla uygulandı');
    
    // Veritabanı bağlantısını test et
    await prisma.$connect();
    console.log('✅ Veritabanı bağlantısı başarılı');
    
    // status ve totalAmount sütunlarının var olup olmadığını kontrol et
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tables' AND column_name IN ('status', 'totalAmount')
    `;
    
    console.log('📊 Mevcut sütunlar:', result);
    
    if (result.length >= 2) {
      console.log('✅ status ve totalAmount sütunları başarıyla eklendi');
    } else {
      console.log('❌ Sütunlar eksik:', result);
    }
    
  } catch (error) {
    console.error('❌ Migration hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration(); 