const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addCompanyTable() {
  try {
    console.log('🔧 Company tablosu ekleniyor...');
    
    // SQL ile Company tablosunu oluştur
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255) UNIQUE NOT NULL,
        logo TEXT,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('✅ Company tablosu oluşturuldu');
    
    // Mevcut tablolara companyId kolonları ekle
    console.log('🔧 Mevcut tablolara companyId kolonları ekleniyor...');
    
    // Users tablosuna companyId ekle
    await prisma.$executeRaw`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS company_id INTEGER,
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
    `;
    
    // Branches tablosuna companyId ekle
    await prisma.$executeRaw`
      ALTER TABLE branches 
      ADD COLUMN IF NOT EXISTS company_id INTEGER;
    `;
    
    // Categories tablosuna companyId ekle
    await prisma.$executeRaw`
      ALTER TABLE categories 
      ADD COLUMN IF NOT EXISTS company_id INTEGER;
    `;
    
    // Products tablosuna companyId ekle
    await prisma.$executeRaw`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS company_id INTEGER;
    `;
    
    // Orders tablosuna companyId ekle
    await prisma.$executeRaw`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS company_id INTEGER;
    `;
    
    // Customers tablosuna companyId ekle
    await prisma.$executeRaw`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS company_id INTEGER;
    `;
    
    // Tables tablosuna companyId ekle
    await prisma.$executeRaw`
      ALTER TABLE tables 
      ADD COLUMN IF NOT EXISTS company_id INTEGER;
    `;
    
    console.log('✅ Tüm tablolara companyId kolonları eklendi');
    
    // Varsayılan bir company oluştur
    console.log('🔧 Varsayılan company oluşturuluyor...');
    
    const defaultCompany = await prisma.$queryRaw`
      INSERT INTO companies (name, domain, address, phone, email)
      VALUES ('Default Company', 'default', 'Default Address', 'Default Phone', 'default@company.com')
      ON CONFLICT (domain) DO NOTHING
      RETURNING id;
    `;
    
    if (defaultCompany && defaultCompany.length > 0) {
      const companyId = defaultCompany[0].id;
      
      // Mevcut verileri varsayılan company'ye ata
      await prisma.$executeRaw`
        UPDATE users SET company_id = ${companyId} WHERE company_id IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE branches SET company_id = ${companyId} WHERE company_id IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE categories SET company_id = ${companyId} WHERE company_id IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE products SET company_id = ${companyId} WHERE company_id IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE orders SET company_id = ${companyId} WHERE company_id IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE customers SET company_id = ${companyId} WHERE company_id IS NULL;
      `;
      
      await prisma.$executeRaw`
        UPDATE tables SET company_id = ${companyId} WHERE company_id IS NULL;
      `;
      
      console.log('✅ Mevcut veriler varsayılan company\'ye atandı');
    }
    
    console.log('✅ Company tablosu başarıyla eklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCompanyTable(); 