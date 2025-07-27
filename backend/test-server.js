const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3002;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Test images endpoint
app.get('/api/admin/images-test', async (req, res) => {
  try {
    console.log('🔍 GET /api/admin/images-test çağrıldı (test endpoint)');
    
    const uploadDir = path.join(__dirname, 'uploads', 'products');
    console.log('🔍 Upload directory:', uploadDir);
    
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Upload directory yok, boş array döndürülüyor');
      return res.json([]);
    }

    const files = fs.readdirSync(uploadDir);
    console.log('📁 Bulunan dosyalar:', files);
    
    const images = files
      .filter(file => {
        try {
          const ext = path.extname(file).toLowerCase();
          const isValid = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          console.log(`🔍 Dosya: ${file}, uzantı: ${ext}, geçerli: ${isValid}`);
          return isValid;
        } catch (error) {
          console.error('Dosya filtresi hatası:', error);
          return false;
        }
      })
      .map(file => {
        try {
          const filePath = path.join(uploadDir, file);
          const stats = fs.statSync(filePath);
          const imageInfo = {
            filename: file,
            path: `/uploads/products/${file}`,
            size: stats.size,
            uploadedAt: stats.mtime
          };
          console.log('📄 Resim bilgisi:', imageInfo);
          return imageInfo;
        } catch (error) {
          console.error('Dosya bilgisi alma hatası:', error);
          return null;
        }
      })
      .filter(image => image !== null)
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    console.log('✅ Toplam resim sayısı:', images.length);
    console.log('✅ Response gönderiliyor:', images);
    res.json({
      message: 'Test endpoint başarılı',
      count: images.length,
      images: images
    });
  } catch (error) {
    console.error('❌ Test resim listesi hatası:', error);
    res.status(500).json({ error: 'Test resim listesi alınamadı' });
  }
});

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Test Server Çalışıyor',
    endpoints: {
      images: 'GET /api/admin/images-test',
      uploads: 'GET /uploads/*'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server ${PORT} portunda çalışıyor`);
  console.log(`🔗 http://localhost:${PORT}/api/admin/images-test`);
}); 