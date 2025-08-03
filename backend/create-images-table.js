const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createImagesTable() {
  try {
    console.log('🔍 Images tablosu oluşturuluyor...');
    
    // SQL ile images tablosunu oluştur
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "images" (
        "id" SERIAL PRIMARY KEY,
        "filename" TEXT UNIQUE NOT NULL,
        "originalName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "dataUrl" TEXT NOT NULL,
        "uploadedBy" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `;
    
    console.log('✅ Images tablosu başarıyla oluşturuldu!');
    
  } catch (error) {
    console.error('❌ Images tablosu oluşturulurken hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createImagesTable(); 