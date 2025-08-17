const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateSalesRecords() {
  try {
    console.log('🔄 Sales records migration başlatılıyor...');

    // 1. Sales records tablosunu oluştur
    console.log('📋 Sales records tablosu oluşturuluyor...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS sales_records (
        id SERIAL PRIMARY KEY,
        "orderId" INTEGER,
        "orderNumber" VARCHAR(255) NOT NULL,
        "branchId" INTEGER NOT NULL,
        "customerId" INTEGER,
        "totalAmount" DECIMAL(10,2) NOT NULL,
        "orderType" VARCHAR(255) DEFAULT 'DELIVERY',
        platform VARCHAR(255),
        "platformOrderId" VARCHAR(255),
        status VARCHAR(255) DEFAULT 'COMPLETED',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("branchId") REFERENCES branches(id),
        FOREIGN KEY ("customerId") REFERENCES customers(id)
      );
    `;

    // 2. Index'leri oluştur
    console.log('📊 Index\'ler oluşturuluyor...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sales_records_branch_id ON sales_records("branchId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sales_records_customer_id ON sales_records("customerId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sales_records_created_at ON sales_records("createdAt");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sales_records_order_id ON sales_records("orderId");`;

    // 3. Mevcut siparişlerden sales records oluştur
    console.log('📦 Mevcut siparişlerden sales records oluşturuluyor...');
    const existingOrders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        branchId: true,
        customerId: true,
        totalAmount: true,
        orderType: true,
        platform: true,
        platformOrderId: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log(`📊 ${existingOrders.length} sipariş bulundu, sales records oluşturuluyor...`);

    for (const order of existingOrders) {
      // Önce bu sipariş için sales record var mı kontrol et
      const existingRecord = await prisma.$queryRaw`
        SELECT id FROM sales_records WHERE "orderId" = ${order.id}
      `;

      if (existingRecord.length === 0) {
        // Sales record oluştur
        await prisma.$executeRaw`
          INSERT INTO sales_records (
            "orderId", "orderNumber", "branchId", "customerId", 
            "totalAmount", "orderType", platform, "platformOrderId", 
            status, "createdAt", "updatedAt"
          ) VALUES (
            ${order.id}, ${order.orderNumber}, ${order.branchId}, ${order.customerId},
            ${order.totalAmount}, ${order.orderType}, ${order.platform}, ${order.platformOrderId},
            ${order.status === 'DELIVERED' ? 'COMPLETED' : order.status}, 
            ${order.createdAt}, ${order.updatedAt}
          )
        `;
      }
    }

    console.log('✅ Sales records migration tamamlandı!');

  } catch (error) {
    console.error('❌ Migration hatası:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Migration'ı çalıştır
if (require.main === module) {
  migrateSalesRecords()
    .then(() => {
      console.log('🎉 Migration başarıyla tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration başarısız:', error);
      process.exit(1);
    });
}

module.exports = { migrateSalesRecords };
