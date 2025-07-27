const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Canlı ortam veritabanı bağlantısı
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://naim:cibKjxXirpnFyQTor7DpBhGXf1XAqmmw@dpg-d1podn2dbo4c73bp2q7g-a.oregon-postgres.render.com:5432/siparis"
    }
  }
});

// Canlı ortam URL'i
const LIVE_URL = 'https://yemek5-backend.onrender.com';

async function downloadImage(imageUrl, localPath) {
  return new Promise((resolve, reject) => {
    const protocol = imageUrl.startsWith('https:') ? https : http;
    
    protocol.get(imageUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${imageUrl}`));
        return;
      }

      const fileStream = fs.createWriteStream(localPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(localPath, () => {}); // Silmeyi dene
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function syncImages() {
  try {
    console.log('🔄 Canlı ortamdan resimler senkronize ediliyor...');
    
    // Uploads klasörünü oluştur
    const uploadsDir = path.join(__dirname, 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads klasörü oluşturuldu');
    }

    // Veritabanından tüm ürünleri al
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`📊 ${products.length} ürün bulundu`);

    let downloadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      if (!product.image || product.image === '/placeholder-image.svg') {
        skippedCount++;
        continue;
      }

      // Resim URL'ini oluştur
      const imageUrl = product.image.startsWith('http') 
        ? product.image 
        : `${LIVE_URL}${product.image}`;

      // Yerel dosya adını oluştur
      const fileName = path.basename(product.image);
      const localPath = path.join(uploadsDir, fileName);

      // Dosya zaten varsa atla
      if (fs.existsSync(localPath)) {
        console.log(`⏭️  Zaten mevcut: ${fileName}`);
        skippedCount++;
        continue;
      }

      try {
        await downloadImage(imageUrl, localPath);
        console.log(`✅ İndirildi: ${fileName}`);
        downloadedCount++;
      } catch (error) {
        console.error(`❌ Hata (${fileName}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Senkronizasyon Tamamlandı:');
    console.log(`✅ İndirilen: ${downloadedCount}`);
    console.log(`⏭️  Atlanan: ${skippedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);

  } catch (error) {
    console.error('❌ Senkronizasyon hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script çalıştır
if (require.main === module) {
  syncImages();
}

module.exports = { syncImages }; 