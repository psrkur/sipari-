const fs = require('fs');
const path = require('path');
const https = require('https');

// Canlı backend URL'i
const LIVE_BACKEND_URL = 'https://yemek5-backend.onrender.com';

// Local uploads klasörü
const LOCAL_UPLOADS_DIR = path.join(__dirname, 'backend', 'uploads', 'products');

// Klasörü oluştur (yoksa)
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  console.log('✅ Local uploads klasörü oluşturuldu:', LOCAL_UPLOADS_DIR);
}

// Canlı ortamdan resim listesini al
async function getLiveImages() {
  return new Promise((resolve, reject) => {
    const url = `${LIVE_BACKEND_URL}/api/admin/images-public`;
    
    console.log('🔍 Canlı ortamdan resim listesi alınıyor:', url);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const images = JSON.parse(data);
          console.log('✅ Canlı ortamdan', images.length, 'resim bulundu');
          resolve(images);
        } catch (error) {
          console.error('❌ JSON parse hatası:', error);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('❌ Canlı ortam bağlantı hatası:', error);
      reject(error);
    });
  });
}

// Resmi indir
async function downloadImage(imageUrl, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(LOCAL_UPLOADS_DIR, filename);
    
    console.log('📥 Resim indiriliyor:', filename);
    
    // Base64 formatındaysa decode et
    if (imageUrl.startsWith('data:image/')) {
      try {
        const base64Data = imageUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        console.log('✅ Base64 resim kaydedildi:', filename);
        resolve();
      } catch (error) {
        console.error('❌ Base64 decode hatası:', error);
        reject(error);
      }
    } else {
      // HTTP URL ise indir
      https.get(imageUrl, (res) => {
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          console.log('✅ HTTP resim indirildi:', filename);
          resolve();
        });
        
        fileStream.on('error', (error) => {
          console.error('❌ Dosya yazma hatası:', error);
          reject(error);
        });
      }).on('error', (error) => {
        console.error('❌ Resim indirme hatası:', error);
        reject(error);
      });
    }
  });
}

// Ana fonksiyon
async function syncImages() {
  try {
    console.log('🔄 Resim senkronizasyonu başlatılıyor...');
    
    // Canlı ortamdan resim listesini al
    const liveImages = await getLiveImages();
    
    if (liveImages.length === 0) {
      console.log('ℹ️ Canlı ortamda resim bulunamadı');
      return;
    }
    
    // Her resmi indir
    for (const image of liveImages) {
      try {
        await downloadImage(image.path, image.filename);
      } catch (error) {
        console.error('❌ Resim indirilemedi:', image.filename, error);
      }
    }
    
    console.log('✅ Resim senkronizasyonu tamamlandı!');
    console.log('📁 Local klasör:', LOCAL_UPLOADS_DIR);
    
  } catch (error) {
    console.error('❌ Senkronizasyon hatası:', error);
  }
}

// Scripti çalıştır
syncImages(); 