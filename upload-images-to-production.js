const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Canlı backend URL'i
const PRODUCTION_URL = 'https://yemek5-backend.onrender.com';

// Local resimler dizini
const LOCAL_IMAGES_DIR = path.join(__dirname, 'backend', 'uploads', 'products');

// Resimleri canlıya yükleme fonksiyonu
async function uploadImagesToProduction() {
  try {
    console.log('🔄 Local resimler canlıya yükleniyor...');
    
    // Local resimler dizinini kontrol et
    if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
      console.error('❌ Local resimler dizini bulunamadı:', LOCAL_IMAGES_DIR);
      return;
    }
    
    // Local resimleri listele
    const files = fs.readdirSync(LOCAL_IMAGES_DIR);
    const imageFiles = files.filter(file => 
      file.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
    
    console.log(`📊 ${imageFiles.length} resim bulundu`);
    
    if (imageFiles.length === 0) {
      console.log('⚠️ Yüklenecek resim bulunamadı');
      return;
    }
    
    let uploadedCount = 0;
    let errorCount = 0;
    
    // Her resmi tek tek yükle
    for (const filename of imageFiles) {
      try {
        const filePath = path.join(LOCAL_IMAGES_DIR, filename);
        const fileBuffer = fs.readFileSync(filePath);
        
        // FormData oluştur
        const formData = new FormData();
        formData.append('image', fileBuffer, {
          filename: filename,
          contentType: 'image/jpeg' // veya uygun content type
        });
        
        console.log(`📤 ${filename} yükleniyor...`);
        
        // Canlıya yükle
        const response = await axios.post(`${PRODUCTION_URL}/api/admin/upload-image`, formData, {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 saniye timeout
        });
        
        if (response.status === 200 || response.status === 201) {
          console.log(`✅ ${filename} başarıyla yüklendi`);
          uploadedCount++;
        } else {
          console.log(`❌ ${filename} yüklenemedi: ${response.status}`);
          errorCount++;
        }
        
        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ ${filename} yüklenirken hata:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Yükleme Sonuçları:');
    console.log(`✅ Başarıyla yüklenen: ${uploadedCount}`);
    console.log(`❌ Hata alan: ${errorCount}`);
    console.log(`📁 Toplam resim: ${imageFiles.length}`);
    
    if (uploadedCount > 0) {
      console.log('\n🎉 Resimler canlıya yüklendi!');
      console.log('🌐 Canlı panelde resimleri kontrol edin: https://arsut.net.tr/admin');
    }
    
  } catch (error) {
    console.error('❌ Genel hata:', error.message);
  }
}

// Scripti çalıştır
uploadImagesToProduction(); 