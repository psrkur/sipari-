const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
    }
  }
});

async function checkBranchColumns() {
  try {
    console.log('🔍 Branches tablosu sütunları kontrol ediliyor...\n');

    // Branches tablosundaki tüm sütunları al
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'branches'
      ORDER BY ordinal_position
    `;
    
    console.log('📊 Branches tablosu sütunları:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // İlk branch kaydını al
    const firstBranch = await prisma.$queryRaw`
      SELECT * FROM branches LIMIT 1
    `;
    
    console.log('\n📋 İlk branch kaydı:');
    if (firstBranch.length > 0) {
      console.log(JSON.stringify(firstBranch[0], null, 2));
    } else {
      console.log('Branch kaydı bulunamadı');
    }

    // Company tablosunu da kontrol et
    const companyColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Companies tablosu sütunları:');
    companyColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranchColumns(); 