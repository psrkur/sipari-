const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const UPLOADS_DIR = path.join(__dirname, 'backend', 'uploads', 'products');
const PRODUCTION_API_URL = 'https://yemek5-backend.onrender.com';

async function uploadImagesToProduction() {
  try {
    console.log('🔄 Resimler canlı backend\'e yükleniyor...\n');
    
    // Uploads klasörünü kontrol et
    if (!fs.existsSync(UPLOADS_DIR)) {
      console.error('❌ Uploads klasörü bulunamadı:', UPLOADS_DIR);
      return;
    }

    // Tüm resim dosyalarını al
    const imageFiles = fs.readdirSync(UPLOADS_DIR).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`📁 ${imageFiles.length} resim dosyası bulundu\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const filename of imageFiles) {
      try {
        const filePath = path.join(UPLOADS_DIR, filename);
        const fileBuffer = fs.readFileSync(filePath);
        
        // FormData oluştur
        const formData = new FormData();
        formData.append('image', fileBuffer, {
          filename: filename,
          contentType: getContentType(filename)
        });

        // Canlı backend'e yükle
        const response = await axios.post(
          `${PRODUCTION_API_URL}/api/admin/upload-image`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Content-Type': 'multipart/form-data'
            },
            timeout: 30000 // 30 saniye timeout
          }
        );

        if (response.status === 200) {
          console.log(`✅ ${filename} başarıyla yüklendi`);
          successCount++;
        } else {
          console.log(`❌ ${filename} yüklenemedi: ${response.status}`);
          errorCount++;
        }

        // Rate limiting - her yükleme arasında 1 saniye bekle
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.log(`❌ ${filename} yüklenemedi: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Yükleme Tamamlandı:`);
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Başarısız: ${errorCount}`);
    console.log(`📁 Toplam: ${imageFiles.length}`);

  } catch (error) {
    console.error('❌ Genel hata:', error.message);
  }
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Script'i çalıştır
uploadImagesToProduction(); 