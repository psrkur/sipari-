require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
    console.log('✅ Prisma veritabanına bağlandı!');
    const test = await prisma.image.findMany({ take: 1 });
    console.log('✅ Sorgu başarılı, örnek veri:', test);
    process.exit(0);
  } catch (err) {
    console.error('❌ Prisma bağlantı veya sorgu hatası:', err);
    process.exit(1);
  }
})();