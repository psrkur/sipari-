const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addNoteColumn() {
  try {
    console.log('🔄 Order_items tablosuna note kolonu ekleniyor...');
    
    // PostgreSQL için ALTER TABLE komutu
    await prisma.$executeRaw`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note TEXT`;
    
    console.log('✅ Note kolonu başarıyla eklendi!');
    
    // Kolonun eklendiğini doğrula
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'order_items' AND column_name = 'note'
    `;
    
    console.log('📊 Kolon bilgisi:', result);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addNoteColumn(); 