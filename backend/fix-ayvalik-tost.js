#!/usr/bin/env node

/**
 * 🔧 Ayvalık Tostu Resim Düzeltme Script
 * 
 * Ayvalık Tostu ürününün resmini base64'e çevirir
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🔧 Ayvalık Tostu Resim Düzeltme Script Başlatılıyor...\n');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

async function fixAyvalikTost() {
  try {
    console.log('🔧 Ayvalık Tostu resmi düzeltiliyor...\n');
    
    // Ayvalık Tostu ürününü bul
    const product = await prisma.product.findFirst({
      where: { name: 'Ayvalık Tostu' },
      select: { id: true, name: true, image: true }
    });
    
    if (!product) {
      console.log('❌ Ayvalık Tostu ürünü bulunamadı');
      return;
    }
    
    console.log(`📊 Ürün: ${product.name}`);
    console.log(`🖼️  Mevcut resim: ${product.image ? product.image.substring(0, 50) + '...' : 'YOK'}`);
    
    // izar_ayvalk.png dosyasını bul
    const uploadsDir = path.join(__dirname, 'uploads', 'products');
    const imagePath = path.join(uploadsDir, 'izar_ayvalk.png');
    
    if (fs.existsSync(imagePath)) {
      // Resim dosyasını base64'e çevir
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      
      // Veritabanını güncelle
      await prisma.product.update({
        where: { id: product.id },
        data: { image: base64Image }
      });
      
      console.log(`✅ ${product.name} -> Base64 resim eklendi (${base64Image.length} karakter)`);
    } else {
      console.log('❌ izar_ayvalk.png dosyası bulunamadı');
      
      // Placeholder resim ekle
      const placeholderImage = `data:image/svg+xml;base64,${Buffer.from(`
<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="300" fill="#f3f4f6"/>
    <rect x="50" y="50" width="300" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
    <circle cx="200" cy="150" r="40" fill="#9ca3af"/>
    <path d="M180 130 L220 150 L180 170 Z" fill="#6b7280"/>
    <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">Resim Yok</text>
</svg>
`).toString('base64')}`;
      
      await prisma.product.update({
        where: { id: product.id },
        data: { image: placeholderImage }
      });
      
      console.log(`✅ ${product.name} -> Placeholder resim eklendi`);
    }
    
    console.log('\n==================================================');
    console.log('📈 AYVALIK TOST FIX TAMAMLANDI');
    console.log('==================================================\n');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAyvalikTost(); 