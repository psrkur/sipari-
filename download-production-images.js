const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Canlı backend URL'i
const PRODUCTION_URL = 'https://yemek5-backend.onrender.com';

// Bilinen resim dosyaları (canlıda mevcut olanlar)
const KNOWN_IMAGES = [
  'sanayi-tostu.png',
  'fanta.png',
  'cocacola.png',
  'pepsi.png',
  'sprite.png',
  'ayran.png',
  'su.png',
  'kumru-sandvic.png',
  'hamburger.png',
  'pizza.png',
  'doner.png',
  'kebap.png',
  'lahmacun.png',
  'pide.png',
  'borek.png',
  'patates.png',
  'salata.png',
  'corba.png',
  'pilav.png',
  'makarna.png'
];

// Resimleri indirme fonksiyonu
async function downloadImages() {
  try {
    console.log('🔄 Canlıdaki resimler indiriliyor...');
    
    // Uploads dizinini oluştur
    const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'products');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('📁 Uploads dizini oluşturuldu');
    }
    
    let downloadedCount = 0;
    let errorCount = 0;
    
    // Her resmi indir
    for (const imageName of KNOWN_IMAGES) {
      try {
        const imageUrl = `${PRODUCTION_URL}/uploads/products/${imageName}`;
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000 // 10 saniye timeout
        });
        
        const filePath = path.join(uploadsDir, imageName);
        fs.writeFileSync(filePath, imageResponse.data);
        
        console.log(`✅ ${imageName} indirildi`);
        downloadedCount++;
        
      } catch (error) {
        console.error(`❌ ${imageName} indirilemedi:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 İndirme tamamlandı!');
    console.log(`✅ Başarılı: ${downloadedCount} resim`);
    console.log(`❌ Hata: ${errorCount} resim`);
    console.log(`📁 Resimler: ${uploadsDir}`);
    
    // Mevcut resimleri listele
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`\n📋 Mevcut resimler (${files.length} adet):`);
      files.forEach(file => console.log(`  - ${file}`));
    }
    
  } catch (error) {
    console.error('❌ İndirme hatası:', error.message);
  }
}

// Scripti çalıştır
downloadImages(); 