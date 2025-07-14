const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function deployMigration() {
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
    
    // imageData alanının var olup olmadığını kontrol et
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'imageData'
    `;
    
    if (result.length > 0) {
      console.log('✅ imageData alanı başarıyla eklendi');
    } else {
      console.log('❌ imageData alanı bulunamadı');
    }
    
  } catch (error) {
    console.error('❌ Migration hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deployMigration(); 