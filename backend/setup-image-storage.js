#!/usr/bin/env node

/**
 * 🖼️ Image Storage Setup Script
 * 
 * Bu script Render'ın ephemeral storage sorununu çözmek için:
 * 1. Resimleri base64 olarak veritabanında saklar
 * 2. Veya Cloudinary'ye yükler
 * 3. Production'da resim sorunlarını çözer
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Güvenli Object.keys kullanımı için utility fonksiyon
const safeObjectKeys = (obj) => {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return Object.keys(obj);
  }
  return [];
};

console.log('🖼️  Image Storage Setup Script Başlatılıyor...\n');

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

async function convertImagesToBase64() {
  try {
    console.log('🔄 Resimler base64\'e çevriliyor...\n');
    
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

    let convertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Her resim dosyası için
    for (const filename of imageFiles) {
      const imagePath = path.join(localUploadsDir, filename);
      
      try {
        // Dosyayı base64'e çevir
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = getMimeType(filename);
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        // Bu resmi kullanan ürünleri bul ve güncelle
        const matchingProducts = products.filter(product => {
          if (!product.image) return false;
          const productImageName = path.basename(product.image);
          return productImageName === filename;
        });

        for (const product of matchingProducts) {
          try {
            await prisma.product.update({
              where: { id: product.id },
              data: { image: dataUrl }
            });
            console.log(`✅ Ürün güncellendi: ${product.name} -> base64 data URL`);
            updatedCount++;
          } catch (error) {
            console.error(`❌ Ürün güncelleme hatası (${product.name}):`, error.message);
            errorCount++;
          }
        }

        if (matchingProducts.length > 0) {
          convertedCount++;
        }

      } catch (error) {
        console.error(`❌ Hata (${filename}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 BASE64 CONVERSION TAMAMLANDI');
    console.log('='.repeat(50));
    console.log(`✅ Dönüştürülen resim: ${convertedCount}`);
    console.log(`✅ Güncellenen ürün: ${updatedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log('='.repeat(50));

    if (convertedCount > 0) {
      console.log('\n💡 Sonraki adımlar:');
      console.log('1. Production sunucusunu yeniden başlatın');
      console.log('2. Resimlerin doğru yüklendiğini kontrol edin');
      console.log('3. Frontend\'de base64 resimleri desteklediğinizden emin olun');
    }

  } catch (error) {
    console.error('❌ Base64 dönüştürme hatası:', error);
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

async function createImageMapping() {
  try {
    console.log('🔄 Image mapping oluşturuluyor...\n');
    
    // Local uploads klasörünü kontrol et
    if (!fs.existsSync(localUploadsDir)) {
      console.error('❌ Local uploads klasörü bulunamadı:', localUploadsDir);
      return;
    }

    // Tüm resim dosyalarını listele
    const files = fs.readdirSync(localUploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    // Image mapping dosyası oluştur
    const mappingData = {};
    
    for (const filename of imageFiles) {
      const imagePath = path.join(localUploadsDir, filename);
      
      try {
        // Dosyayı base64'e çevir
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = getMimeType(filename);
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        
        mappingData[filename] = dataUrl;
        console.log(`✅ Mapping oluşturuldu: ${filename}`);
      } catch (error) {
        console.error(`❌ Hata (${filename}):`, error.message);
      }
    }

    // Mapping dosyasını kaydet
    const mappingPath = path.join(__dirname, 'image-mapping.json');
    fs.writeFileSync(mappingPath, JSON.stringify(mappingData, null, 2));
    
    console.log(`\n✅ Image mapping dosyası oluşturuldu: ${mappingPath}`);
    console.log(`📊 ${safeObjectKeys(mappingData).length} resim mapping'e eklendi`);

  } catch (error) {
    console.error('❌ Image mapping oluşturma hatası:', error);
    process.exit(1);
  }
}

// Script çalıştır
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'mapping') {
    createImageMapping();
  } else {
    convertImagesToBase64();
  }
}

module.exports = { convertImagesToBase64, createImageMapping }; 