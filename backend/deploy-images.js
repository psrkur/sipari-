#!/usr/bin/env node

/**
 * 🖼️ Image Deployment Script
 * 
 * Bu script yerel resimleri production'a deploy eder.
 * Render'ın ephemeral storage sorunu için çözüm.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

console.log('🖼️  Image Deployment Script Başlatılıyor...\n');

// Veritabanı bağlantısı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

// Local uploads directory
const localUploadsDir = path.join(__dirname, 'uploads', 'products');

async function createImageData() {
  try {
    console.log('🔄 Image data oluşturuluyor...\n');
    
    // Local uploads klasörünü kontrol et
    if (!fs.existsSync(localUploadsDir)) {
      console.error('❌ Local uploads klasörü bulunamadı:', localUploadsDir);
      return;
    }

    console.log('✅ Local uploads klasörü mevcut:', localUploadsDir);

    // Tüm resim dosyalarını listele
    const files = fs.readdirSync(localUploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`📊 ${imageFiles.length} resim dosyası bulundu\n`);

    // Veritabanından tüm ürünleri al
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`📊 ${products.length} ürün veritabanında bulundu\n`);

    let processedCount = 0;
    let errorCount = 0;

    // Her resim dosyası için base64 data oluştur
    for (const filename of imageFiles) {
      const imagePath = path.join(localUploadsDir, filename);
      
      try {
        // Dosyayı base64'e çevir
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = getMimeType(filename);
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        // Bu resmi kullanan ürünleri bul
        const matchingProducts = products.filter(product => {
          if (!product.image) return false;
          const productImageName = path.basename(product.image);
          return productImageName === filename;
        });

        if (matchingProducts.length > 0) {
          console.log(`✅ ${filename} -> ${matchingProducts.length} ürün için data URL oluşturuldu`);
          processedCount++;
        } else {
          console.log(`⚠️  ${filename} için eşleşen ürün bulunamadı`);
        }

      } catch (error) {
        console.error(`❌ Hata (${filename}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 IMAGE DATA OLUŞTURMA TAMAMLANDI');
    console.log('='.repeat(50));
    console.log(`✅ İşlenen: ${processedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log('='.repeat(50));

    console.log('\n💡 Sonraki adımlar:');
    console.log('1. Bu scripti production\'da çalıştırın');
    console.log('2. Resimlerin doğru yüklendiğini kontrol edin');
    console.log('3. Gerekirse veritabanını güncelleyin');

  } catch (error) {
    console.error('❌ Image data oluşturma hatası:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

// Script çalıştır
if (require.main === module) {
  createImageData();
}

module.exports = { createImageData }; 