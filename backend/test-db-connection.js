const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30';

async function testDatabaseConnection() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    },
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  });

  try {
    console.log('🔍 Veritabanı bağlantısı test ediliyor...');
    console.log(`📊 Database URL: ${DATABASE_URL.substring(0, 50)}...`);
    
    // Bağlantıyı test et
    await prisma.$connect();
    console.log('✅ Veritabanı bağlantısı başarılı');
    
    // Basit bir sorgu test et
    const userCount = await prisma.user.count();
    console.log(`📊 Kullanıcı sayısı: ${userCount}`);
    
    // Tablo listesini kontrol et
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📋 Mevcut tablolar:', tables.map(t => t.table_name));
    
    await prisma.$disconnect();
    console.log('✅ Test tamamlandı');
    
  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error);
    
    if (error.code === 'E57P01') {
      console.log('💡 Çözüm önerileri:');
      console.log('1. Veritabanı sunucusu yeniden başlatılıyor olabilir');
      console.log('2. Bağlantı havuzu limitleri aşılmış olabilir');
      console.log('3. Ağ bağlantısı sorunları olabilir');
      console.log('4. Render PostgreSQL servisi bakım modunda olabilir');
    }
    
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Script çalıştır
testDatabaseConnection(); 