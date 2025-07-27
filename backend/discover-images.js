#!/usr/bin/env node

/**
 * 🔍 Otomatik Resim Keşfi ve İndirme Scripti
 * 
 * Kullanım:
 * node discover-images.js
 * 
 * Bu script canlı ortamdan resimleri keşfeder ve indirir.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

console.log('🔍 Otomatik Resim Keşfi Scripti Başlatılıyor...\n');

// Canlı ortam URL'i
const LIVE_URL = 'https://yemek5-backend.onrender.com';

// Bilinen resim dosyaları (canlı ortamda var olan)
const knownImages = [
  '/uploads/products/çizar_salam_kaşar_sandviç.png',
  '/uploads/products/çizar_salam_kaşar_sandviç.png', // Orijinal dosya
  // Yeni resimler buraya eklenebilir
];

// Yaygın resim uzantıları
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

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

async function checkImageExists(imageUrl) {
  return new Promise((resolve) => {
    const protocol = imageUrl.startsWith('https:') ? https : http;
    
    protocol.get(imageUrl, (response) => {
      resolve(response.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function discoverAndDownloadImages() {
  try {
    console.log('🔄 Resimler keşfediliyor ve indiriliyor...');
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
    let discoveredCount = 0;

    // Bilinen resimleri kontrol et ve indir
    for (const imagePath of knownImages) {
      const imageUrl = `${LIVE_URL}${imagePath}`;
      const fileName = path.basename(imagePath);
      const localPath = path.join(uploadsDir, fileName);

      // Dosya zaten varsa atla
      if (fs.existsSync(localPath)) {
        console.log(`⏭️  Zaten mevcut: ${fileName}`);
        skippedCount++;
        continue;
      }

      // Resmin var olup olmadığını kontrol et
      const exists = await checkImageExists(imageUrl);
      if (!exists) {
        console.log(`❌ Bulunamadı: ${fileName}`);
        errorCount++;
        continue;
      }

      try {
        await downloadImage(imageUrl, localPath);
        console.log(`✅ İndirildi: ${fileName}`);
        downloadedCount++;
        discoveredCount++;
      } catch (error) {
        console.error(`❌ Hata (${fileName}):`, error.message);
        errorCount++;
      }
    }

    // Yerel dosyaları kontrol et ve eksik olanları raporla
    console.log('\n📋 Yerel Dosya Analizi:');
    const localFiles = fs.readdirSync(uploadsDir);
    const localImages = localFiles.filter(file => 
      imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );

    console.log(`📁 Yerel resim sayısı: ${localImages.length}`);
    localImages.forEach(file => {
      console.log(`   📄 ${file}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('📈 KEŞİF VE İNDİRME TAMAMLANDI');
    console.log('='.repeat(50));
    console.log(`✅ İndirilen: ${downloadedCount}`);
    console.log(`⏭️  Atlanan: ${skippedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`🔍 Keşfedilen: ${discoveredCount}`);
    console.log(`📁 Klasör: ${uploadsDir}`);
    console.log('='.repeat(50));

    if (downloadedCount > 0) {
      console.log('\n💡 Öneriler:');
      console.log('1. İndirilen resimleri kontrol edin');
      console.log('2. Deploy öncesi bu scripti çalıştırın');
      console.log('3. Git commit yapmadan önce resimleri test edin');
      console.log('4. Yeni resimler için knownImages dizisini güncelleyin');
    }

    // Yeni resimler için öneriler
    console.log('\n📝 Yeni Resim Ekleme:');
    console.log('1. Canlı ortama resim yükleyin');
    console.log('2. Bu scripti çalıştırın');
    console.log('3. Eksik resimleri discover-images.js dosyasına ekleyin');

  } catch (error) {
    console.error('❌ Keşif hatası:', error);
    process.exit(1);
  }
}

// Script çalıştır
discoverAndDownloadImages(); 