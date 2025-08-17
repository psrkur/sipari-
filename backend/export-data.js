const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Güvenli Object.keys kullanımı için utility fonksiyon
const safeObjectKeys = (obj) => {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.keys(obj);
  }
  return [];
};

const prisma = new PrismaClient();

async function exportDatabaseData() {
  try {
    console.log('🔄 Veritabanı verileri export ediliyor...');
    
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `database-export-${timestamp}.json`);
    
    // Tüm tabloları export et
    const data = {
      exportDate: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL,
      tables: {}
    };
    
    // Users
    console.log('📊 Users tablosu export ediliyor...');
    data.tables.users = await prisma.user.findMany();
    
    // Companies
    console.log('📊 Companies tablosu export ediliyor...');
    data.tables.companies = await prisma.company.findMany();
    
    // Branches
    console.log('📊 Branches tablosu export ediliyor...');
    data.tables.branches = await prisma.branch.findMany();
    
    // Categories
    console.log('📊 Categories tablosu export ediliyor...');
    data.tables.categories = await prisma.category.findMany();
    
    // Products
    console.log('📊 Products tablosu export ediliyor...');
    data.tables.products = await prisma.product.findMany();
    
    // Customers
    console.log('📊 Customers tablosu export ediliyor...');
    data.tables.customers = await prisma.customer.findMany();
    
    // Tables
    console.log('📊 Tables tablosu export ediliyor...');
    data.tables.tables = await prisma.table.findMany();
    
    // Orders
    console.log('📊 Orders tablosu export ediliyor...');
    data.tables.orders = await prisma.order.findMany();
    
    // OrderItems
    console.log('📊 OrderItems tablosu export ediliyor...');
    data.tables.orderItems = await prisma.orderItem.findMany();
    
    // UserAddresses
    console.log('📊 UserAddresses tablosu export ediliyor...');
    data.tables.userAddresses = await prisma.userAddress.findMany();
    
    // TablePayments
    console.log('📊 TablePayments tablosu export ediliyor...');
    data.tables.tablePayments = await prisma.tablePayment.findMany();
    
    // PlatformConfigs
    console.log('📊 PlatformConfigs tablosu export ediliyor...');
    data.tables.platformConfigs = await prisma.platformConfig.findMany();
    
    // ChatMessages
    console.log('📊 ChatMessages tablosu export ediliyor...');
    data.tables.chatMessages = await prisma.chatMessage.findMany();
    
    // Images
    console.log('📊 Images tablosu export ediliyor...');
    data.tables.images = await prisma.image.findMany();
    
    // JSON dosyasına yaz
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    
    const fileSize = fs.statSync(backupFile).size;
    console.log(`✅ Veritabanı export tamamlandı: ${backupFile} (${formatFileSize(fileSize)})`);
    
    // İstatistikler
    const stats = {
      totalTables: safeObjectKeys(data.tables).length,
      totalRecords: Object.values(data.tables).reduce((sum, table) => sum + table.length, 0),
      fileSize: fileSize,
      exportDate: data.exportDate
    };
    
    console.log('📊 Export İstatistikleri:');
    console.log(`   - Toplam Tablo: ${stats.totalTables}`);
    console.log(`   - Toplam Kayıt: ${stats.totalRecords}`);
    console.log(`   - Dosya Boyutu: ${formatFileSize(stats.fileSize)}`);
    
    return backupFile;
    
  } catch (error) {
    console.error('❌ Export hatası:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Script çalıştırılırsa
if (require.main === module) {
  exportDatabaseData()
    .then(() => {
      console.log('✅ Veritabanı export işlemi başarıyla tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Export işlemi başarısız:', error);
      process.exit(1);
    });
}

module.exports = { exportDatabaseData }; 