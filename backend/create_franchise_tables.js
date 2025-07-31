const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com/siparis?sslmode=require&connect_timeout=30'
    }
  }
});

async function createFranchiseTables() {
  try {
    console.log('Franchise tabloları oluşturuluyor...');
    
    // Franchises tablosu
    console.log('1. Franchises tablosu oluşturuluyor...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS franchises (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        ownerName VARCHAR(255) NOT NULL,
        ownerEmail VARCHAR(255) NOT NULL,
        ownerPhone VARCHAR(50),
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        agreementDate TIMESTAMP NOT NULL,
        expiryDate TIMESTAMP,
        monthlyRoyalty DECIMAL(10,2) DEFAULT 0,
        performanceScore DECIMAL(5,2) DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Franchise support tickets tablosu
    console.log('2. Franchise support tickets tablosu oluşturuluyor...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS franchise_support_tickets (
        id SERIAL PRIMARY KEY,
        franchiseId INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'open',
        assignedTo VARCHAR(255),
        resolution TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (franchiseId) REFERENCES franchises(id) ON DELETE CASCADE
      )
    `);
    
    // Franchise performance reports tablosu
    console.log('3. Franchise performance reports tablosu oluşturuluyor...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS franchise_performance_reports (
        id SERIAL PRIMARY KEY,
        franchiseId INTEGER NOT NULL,
        reportDate TIMESTAMP NOT NULL,
        monthlyRevenue DECIMAL(12,2) NOT NULL,
        orderCount INTEGER NOT NULL,
        customerCount INTEGER NOT NULL,
        averageOrderValue DECIMAL(10,2) NOT NULL,
        customerSatisfaction DECIMAL(5,2) NOT NULL,
        complianceScore DECIMAL(5,2) NOT NULL,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (franchiseId) REFERENCES franchises(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Franchise tabloları başarıyla oluşturuldu!');
    
    // Test verisi ekle (raw SQL ile)
    console.log('Test franchise verisi ekleniyor...');
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO franchises (name, code, ownerName, ownerEmail, ownerPhone, address, city, agreementDate, monthlyRoyalty)
      VALUES ('Test Franchise', 'FR001', 'Test Sahip', 'test@example.com', '555-1234', 'Test Adres, Test Mahalle', 'İstanbul', NOW(), 1000.00)
      ON CONFLICT (code) DO NOTHING
    `);
    
    console.log('✅ Test franchise oluşturuldu: FR001');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFranchiseTables(); 