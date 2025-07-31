import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

console.log('🔧 Production Prisma client yeniden oluşturuluyor...');

try {
  // Prisma client'ı yeniden oluştur
  console.log('📦 npx prisma generate çalıştırılıyor...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Prisma client başarıyla yeniden oluşturuldu!');
  
  // Test query çalıştır
  console.log('🧪 Test query çalıştırılıyor...');
  const prisma = new PrismaClient();
  
  const branches = await prisma.branch.findMany({
    take: 1,
    select: {
      id: true,
      name: true,
      companyId: true
    }
  });
  
  console.log('✅ Test başarılı! İlk branch:', branches[0]);
  
  await prisma.$disconnect();
  
} catch (error) {
  console.error('❌ Hata:', error.message);
  process.exit(1);
} 