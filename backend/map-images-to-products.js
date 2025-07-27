#!/usr/bin/env node

/**
 * 🖼️ Image to Product Mapping Script
 * 
 * Bu script yerel resim dosyalarını veritabanındaki ürünlerle eşleştirir.
 * Ürün adları ile resim dosya adları arasında benzerlik arar.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log('🖼️  Image to Product Mapping Script Başlatılıyor...\n');

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

function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/[çğıöşü]/g, (match) => {
      const map = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
      return map[match] || match;
    })
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function findBestMatch(productName, imageFiles) {
  const normalizedProductName = normalizeString(productName);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const imageFile of imageFiles) {
    const normalizedImageName = normalizeString(imageFile);
    
    // Exact match
    if (normalizedImageName.includes(normalizedProductName) || 
        normalizedProductName.includes(normalizedImageName)) {
      return imageFile;
    }
    
    // Partial match scoring
    let score = 0;
    const productWords = normalizedProductName.split(/(?<=[a-z])(?=[a-z])/);
    const imageWords = normalizedImageName.split(/(?<=[a-z])(?=[a-z])/);
    
    for (const productWord of productWords) {
      if (productWord.length > 2) {
        for (const imageWord of imageWords) {
          if (imageWord.includes(productWord) || productWord.includes(imageWord)) {
            score += productWord.length;
          }
        }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = imageFile;
    }
  }
  
  return bestScore > 3 ? bestMatch : null;
}

async function mapImagesToProducts() {
  try {
    console.log('🔄 Resimler ürünlerle eşleştiriliyor...\n');
    
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

    let matchedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Her ürün için en iyi eşleşmeyi bul
    for (const product of products) {
      const bestMatch = findBestMatch(product.name, imageFiles);
      
      if (bestMatch) {
        console.log(`✅ Eşleşme bulundu: ${product.name} -> ${bestMatch}`);
        matchedCount++;
        
        // Resmi base64'e çevir ve veritabanını güncelle
        try {
          const imagePath = path.join(localUploadsDir, bestMatch);
          const imageBuffer = fs.readFileSync(imagePath);
          const base64Data = imageBuffer.toString('base64');
          const mimeType = getMimeType(bestMatch);
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          
          await prisma.product.update({
            where: { id: product.id },
            data: { image: dataUrl }
          });
          
          console.log(`  ✅ Veritabanı güncellendi: ${product.name}`);
          updatedCount++;
          
        } catch (error) {
          console.error(`  ❌ Güncelleme hatası (${product.name}):`, error.message);
          errorCount++;
        }
      } else {
        console.log(`❌ Eşleşme bulunamadı: ${product.name}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 IMAGE MAPPING TAMAMLANDI');
    console.log('='.repeat(50));
    console.log(`✅ Eşleşme bulunan: ${matchedCount}`);
    console.log(`✅ Güncellenen ürün: ${updatedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log('='.repeat(50));

    if (updatedCount > 0) {
      console.log('\n💡 Sonraki adımlar:');
      console.log('1. Production sunucusunu yeniden başlatın');
      console.log('2. Resimlerin doğru yüklendiğini kontrol edin');
      console.log('3. Eşleşmeleri manuel olarak kontrol edin');
    }

  } catch (error) {
    console.error('❌ Mapping hatası:', error);
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
  mapImagesToProducts();
}

module.exports = { mapImagesToProducts }; 