const { PrismaClient } = require('@prisma/client');

async function createChatMessageTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 ChatMessage tablosu oluşturuluyor...');
    
    // ChatMessage tablosunu oluştur
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        customerId INTEGER NOT NULL,
        message TEXT NOT NULL,
        platform VARCHAR(50) DEFAULT 'web',
        direction VARCHAR(20) NOT NULL,
        isProcessed BOOLEAN DEFAULT false,
        responseType VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      );
    `;
    
    console.log('✅ ChatMessage tablosu başarıyla oluşturuldu!');
    
    // Test verisi ekle
    await prisma.chatMessage.create({
      data: {
        customerId: 1,
        message: 'Test mesajı',
        platform: 'web',
        direction: 'incoming',
        isProcessed: false
      }
    });
    
    console.log('✅ Test verisi eklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createChatMessageTable(); 