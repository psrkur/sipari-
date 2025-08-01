const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function optimizeDatabase() {
  try {
    console.log('🔧 Veritabanı optimizasyonu başlatılıyor...');

    // Performans için gerekli indeksler
    const indexes = [
      // Users tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email")',
      'CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role")',
      'CREATE INDEX IF NOT EXISTS "users_branchId_idx" ON "users"("branchId")',
      'CREATE INDEX IF NOT EXISTS "users_isActive_idx" ON "users"("isActive")',
      
      // Products tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "products_branchId_idx" ON "products"("branchId")',
      'CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId")',
      'CREATE INDEX IF NOT EXISTS "products_isActive_idx" ON "products"("isActive")',
      'CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products"("name")',
      
      // Orders tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "orders_branchId_idx" ON "orders"("branchId")',
      'CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON "orders"("userId")',
      'CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status")',
      'CREATE INDEX IF NOT EXISTS "orders_orderType_idx" ON "orders"("orderType")',
      'CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt")',
      'CREATE INDEX IF NOT EXISTS "orders_tableId_idx" ON "orders"("tableId")',
      
      // OrderItems tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "orderItems_orderId_idx" ON "orderItems"("orderId")',
      'CREATE INDEX IF NOT EXISTS "orderItems_productId_idx" ON "orderItems"("productId")',
      
      // Categories tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "categories_name_idx" ON "categories"("name")',
      'CREATE INDEX IF NOT EXISTS "categories_isActive_idx" ON "categories"("isActive")',
      
      // Branches tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "branches_isActive_idx" ON "branches"("isActive")',
      'CREATE INDEX IF NOT EXISTS "branches_companyId_idx" ON "branches"("companyId")',
      
      // Tables tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "tables_branchId_idx" ON "tables"("branchId")',
      'CREATE INDEX IF NOT EXISTS "tables_isActive_idx" ON "tables"("isActive")',
      
      // Customers tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone")',
      'CREATE INDEX IF NOT EXISTS "customers_createdAt_idx" ON "customers"("createdAt")',
      
      // UserAddresses tablosu indeksleri
      'CREATE INDEX IF NOT EXISTS "userAddresses_userId_idx" ON "userAddresses"("userId")',
      'CREATE INDEX IF NOT EXISTS "userAddresses_isDefault_idx" ON "userAddresses"("isDefault")'
    ];

    console.log('📊 İndeksler oluşturuluyor...');
    
    for (const indexQuery of indexes) {
      try {
        await prisma.$executeRawUnsafe(indexQuery);
        console.log(`✅ İndeks oluşturuldu: ${indexQuery.split('"')[1]}`);
      } catch (error) {
        console.log(`⚠️  İndeks zaten mevcut veya oluşturulamadı: ${indexQuery.split('"')[1]}`);
      }
    }

    // Veritabanı istatistiklerini güncelle
    console.log('📈 Veritabanı istatistikleri güncelleniyor...');
    await prisma.$executeRawUnsafe('ANALYZE');

    // Bağlantı havuzu ayarlarını optimize et
    console.log('🔗 Bağlantı havuzu ayarları optimize ediliyor...');
    
    // PostgreSQL ayarlarını optimize et
    const optimizations = [
      'SET shared_preload_libraries = \'pg_stat_statements\'',
      'SET max_connections = 100',
      'SET shared_buffers = \'256MB\'',
      'SET effective_cache_size = \'1GB\'',
      'SET maintenance_work_mem = \'64MB\'',
      'SET checkpoint_completion_target = 0.9',
      'SET wal_buffers = \'16MB\'',
      'SET default_statistics_target = 100',
      'SET random_page_cost = 1.1',
      'SET effective_io_concurrency = 200'
    ];

    for (const optimization of optimizations) {
      try {
        await prisma.$executeRawUnsafe(optimization);
      } catch (error) {
        console.log(`⚠️  Optimizasyon ayarı uygulanamadı: ${optimization}`);
      }
    }

    console.log('✅ Veritabanı optimizasyonu tamamlandı!');
    
    // Performans istatistiklerini göster
    const stats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `;
    
    console.log('📊 Veritabanı istatistikleri:');
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('❌ Veritabanı optimizasyonu hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script çalıştır
if (require.main === module) {
  optimizeDatabase();
}

module.exports = { optimizeDatabase }; 