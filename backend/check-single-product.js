#!/usr/bin/env node

/**
 * 🔍 Single Product Image Check Script
 * 
 * Tek bir ürünün resim alanını kontrol eder
 */

const { PrismaClient } = require('@prisma/client');

console.log('🔍 Single Product Image Check Script Başlatılıyor...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

async function checkSingleProduct() {
  try {
    console.log('🔍 Tek ürün kontrol ediliyor...\n');
    
    const product = await prisma.product.findFirst({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    if (product) {
      console.log(`📊 Ürün: ${product.name}`);
      console.log(`🆔 ID: ${product.id}`);
      console.log(`🖼️  Image: ${product.image ? product.image.substring(0, 100) + '...' : 'YOK'}`);
      
      if (product.image && product.image.startsWith('data:image/')) {
        console.log('✅ Base64 resim tespit edildi');
      } else if (product.image && (product.image.includes('/uploads/') || product.image.includes('.png'))) {
        console.log('⚠️  Dosya yolu tespit edildi');
      } else {
        console.log('❓ Bilinmeyen format');
      }
    } else {
      console.log('❌ Ürün bulunamadı');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSingleProduct(); 