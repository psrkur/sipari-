#!/usr/bin/env node

/**
 * 🖼️ Basit Resim İndirme Scripti
 * 
 * Kullanım:
 * node download-images-simple.js
 * 
 * Bu script canlı ortamdan bilinen resimleri indirir.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🖼️  Basit Resim İndirme Scripti Başlatılıyor...\n');

// Canlı ortam URL'i
const LIVE_URL = 'https://yemek5-backend.onrender.com';

// Bilinen resim dosyaları (canlı ortamda var olan)
const knownImages = [
  '/uploads/products/çizar_salam_kaşar_sandviç.png',
  // Buraya daha fazla resim eklenebilir
];

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

async function downloadKnownImages() {
  try {
    console.log('🔄 Bilinen resimler indiriliyor...');
    console.log(`🌐 Canlı URL: ${LIVE_URL}\n`);
    
    // Uploads klasörünü oluştur
    const uploadsDir = path.join(__dirname, 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads klasörü oluşturuldu:', uploadsDir);
    } else {
      console.log('✅ Uploads klasörü mevcut:', uploadsDir);
    }

    let downloadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const imagePath of knownImages) {
      // Resim URL'ini oluştur
      const imageUrl = `${LIVE_URL}${imagePath}`;

      // Yerel dosya adını oluştur
      const fileName = path.basename(imagePath);
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

    console.log('\n' + '='.repeat(50));
    console.log('📈 İNDİRME TAMAMLANDI');
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
    console.error('❌ İndirme hatası:', error);
    process.exit(1);
  }
}

// Script çalıştır
downloadKnownImages(); 