#!/usr/bin/env node

/**
 * 🖼️ Production Image Fix Script
 * 
 * Bu script production'da çalışır ve resim sorunlarını çözer.
 * Render'ın ephemeral storage sorunu için çözüm.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🖼️  Production Image Fix Script Başlatılıyor...\n');

// Veritabanı bağlantısı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

// Base64 placeholder image (SVG)
const placeholderImage = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="300" fill="#f3f4f6"/>
    <rect x="50" y="50" width="300" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
    <circle cx="200" cy="150" r="40" fill="#9ca3af"/>
    <path d="M180 130 L220 150 L180 170 Z" fill="#6b7280"/>
    <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">Resim Yok</text>
</svg>
`).toString('base64')}`;

async function fixProductionImages() {
  try {
    console.log('🔄 Production resim sorunları düzeltiliyor...\n');
    
    // Tüm ürünleri al
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`📊 ${products.length} ürün bulundu\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Eğer resim base64 değilse veya placeholder ise güncelle
        if (!product.image || 
            product.image.includes('FILE_NOT_FOUND') || 
            product.image.includes('uploads/') ||
            product.image.length < 100) {
          
          await prisma.product.update({
            where: { id: product.id },
            data: { image: placeholderImage }
          });
          
          console.log(`✅ ${product.name} -> Placeholder resim eklendi`);
          updatedCount++;
        }
      } catch (error) {
        console.log(`❌ ${product.name} -> Hata: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n==================================================');
    console.log('📈 PRODUCTION IMAGE FIX TAMAMLANDI');
    console.log('==================================================');
    console.log(`✅ Güncellenen ürün: ${updatedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log('==================================================\n');

    console.log('💡 Sonraki adımlar:');
    console.log('1. Uygulamayı yeniden başlatın');
    console.log('2. Resimlerin doğru yüklendiğini kontrol edin');
    console.log('3. Gerekirse manuel resim ekleyin');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
fixProductionImages(); 