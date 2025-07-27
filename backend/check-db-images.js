#!/usr/bin/env node

/**
 * 🔍 Database Image Check Script
 * 
 * Veritabanındaki resim durumunu kontrol eder
 */

const { PrismaClient } = require('@prisma/client');

console.log('🔍 Database Image Check Script Başlatılıyor...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

async function checkDatabaseImages() {
  try {
    console.log('🔍 Veritabanındaki resimler kontrol ediliyor...\n');
    
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`📊 ${products.length} ürün bulundu\n`);

    let base64Count = 0;
    let filePathCount = 0;
    let emptyCount = 0;
    let otherCount = 0;

    for (const product of products) {
      if (!product.image || product.image.trim() === '') {
        console.log(`❌ ${product.name} -> Resim yok`);
        emptyCount++;
      } else if (product.image.startsWith('data:image/')) {
        console.log(`✅ ${product.name} -> Base64 resim (${product.image.length} karakter)`);
        base64Count++;
      } else if (product.image.includes('/uploads/') || product.image.includes('.png') || product.image.includes('.jpg')) {
        console.log(`⚠️  ${product.name} -> Dosya yolu: ${product.image}`);
        filePathCount++;
      } else {
        console.log(`❓ ${product.name} -> Diğer: ${product.image.substring(0, 50)}...`);
        otherCount++;
      }
    }

    console.log('\n==================================================');
    console.log('📈 DATABASE IMAGE STATUS');
    console.log('==================================================');
    console.log(`✅ Base64 resimler: ${base64Count}`);
    console.log(`⚠️  Dosya yolu resimler: ${filePathCount}`);
    console.log(`❌ Boş resimler: ${emptyCount}`);
    console.log(`❓ Diğer: ${otherCount}`);
    console.log(`📊 Toplam: ${products.length}`);
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseImages(); 