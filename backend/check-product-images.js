#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

// Canlı ortam veritabanı bağlantısı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis?sslmode=require"
    }
  }
});

async function checkProductImages() {
  try {
    console.log('🔍 Veritabanındaki ürün resimleri kontrol ediliyor...');
    
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });
    
    console.log('📊 Toplam ürün sayısı:', products.length);
    console.log('\n🖼️  Ürün Resim Listesi:');
    
    let withImages = 0;
    let withoutImages = 0;
    
    products.forEach(product => {
      console.log(`\n🆔 ID: ${product.id}`);
      console.log(`📦 Ürün: ${product.name}`);
      console.log(`🖼️  Image: ${product.image || 'Yok'}`);
      
      if (product.image) {
        withImages++;
      } else {
        withoutImages++;
      }
    });
    
    console.log('\n📈 Özet:');
    console.log(`✅ Resimli ürünler: ${withImages}`);
    console.log(`❌ Resimsiz ürünler: ${withoutImages}`);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductImages(); 