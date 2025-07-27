#!/usr/bin/env node

/**
 * 🖼️ Manuel Resim Senkronizasyon Scripti
 * 
 * Kullanım:
 * node sync-images-manual.js
 * 
 * Bu script canlı ortamdan tüm resimleri indirir ve yerel uploads klasörüne kaydeder.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🖼️  Resim Senkronizasyon Scripti Başlatılıyor...\n');

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
    
    console.log(`📥 İndiriliyor: ${imageUrl}`);
    
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
    console.log(`🌐 Canlı URL: ${LIVE_URL}\n`);
    
    // Uploads klasörünü oluştur
    const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads klasörü oluşturuldu:', uploadsDir);
    } else {
      console.log('✅ Uploads klasörü mevcut:', uploadsDir);
    }

    // Veritabanından tüm ürünleri al
    console.log('📊 Veritabanından ürünler alınıyor...');
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    console.log(`📊 ${products.length} ürün bulundu\n`);

    let downloadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      if (!product.image || product.image === '/placeholder-image.svg') {
        console.log(`⏭️  Atlanan (placeholder): ${product.name}`);
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
        console.log(`⏭️  Zaten mevcut: ${fileName} (${product.name})`);
        skippedCount++;
        continue;
      }

      try {
        await downloadImage(imageUrl, localPath);
        console.log(`✅ İndirildi: ${fileName} (${product.name})`);
        downloadedCount++;
      } catch (error) {
        console.error(`❌ Hata (${fileName}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 SENKRONİZASYON TAMAMLANDI');
    console.log('='.repeat(50));
    console.log(`✅ İndirilen: ${downloadedCount}`);
    console.log(`⏭️  Atlanan: ${skippedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📁 Klasör: ${uploadsDir}`);
    console.log('='.repeat(50));

    if (downloadedCount > 0) {
      console.log('\n💡 Öneriler:');
      console.log('1. İndirilen resimleri kontrol edin');
      console.log('2. Deploy öncesi bu scripti çalıştırın');
      console.log('3. Git commit yapmadan önce resimleri test edin');
    }

  } catch (error) {
    console.error('❌ Senkronizasyon hatası:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script çalıştır
syncImages(); 