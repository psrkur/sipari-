#!/usr/bin/env node

/**
 * 🖼️ Production Image Upload Script
 * 
 * Bu script yerel uploads klasöründeki resimleri production sunucusuna yükler.
 * Render'ın ephemeral storage sorunu nedeniyle resimler kaybolmuş olabilir.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const FormData = require('form-data');

console.log('🖼️  Production Image Upload Script Başlatılıyor...\n');

// Production server URL
const PRODUCTION_URL = 'https://yemek5-backend.onrender.com';

// Local uploads directory
const localUploadsDir = path.join(__dirname, 'uploads', 'products');

async function uploadImageToProduction(imagePath, filename) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath), {
      filename: filename,
      contentType: 'image/png' // veya dosya uzantısına göre
    });

    const options = {
      hostname: 'yemek5-backend.onrender.com',
      port: 443,
      path: '/api/admin/upload-image',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Yüklendi: ${filename}`);
          resolve();
        } else {
          console.error(`❌ Upload hatası (${filename}): ${res.statusCode} - ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Network hatası (${filename}):`, err.message);
      reject(err);
    });

    form.pipe(req);
  });
}

async function uploadAllImages() {
  try {
    console.log('🔄 Production sunucusuna resimler yükleniyor...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}\n`);
    
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

    let uploadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const filename of imageFiles) {
      const imagePath = path.join(localUploadsDir, filename);
      
      try {
        await uploadImageToProduction(imagePath, filename);
        uploadedCount++;
      } catch (error) {
        console.error(`❌ Hata (${filename}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 UPLOAD TAMAMLANDI');
    console.log('='.repeat(50));
    console.log(`✅ Yüklenen: ${uploadedCount}`);
    console.log(`⏭️  Atlanan: ${skippedCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log('='.repeat(50));

    if (uploadedCount > 0) {
      console.log('\n💡 Öneriler:');
      console.log('1. Production sunucusunu yeniden başlatın');
      console.log('2. Resimlerin doğru yüklendiğini kontrol edin');
      console.log('3. Veritabanındaki resim yollarını güncelleyin');
    }

  } catch (error) {
    console.error('❌ Upload hatası:', error);
    process.exit(1);
  }
}

// Script çalıştır
uploadAllImages(); 