const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const PRODUCTION_API_URL = 'https://yemek5-backend.onrender.com';

async function testImageUpload() {
  try {
    console.log('🔄 Resim yükleme testi başlatılıyor...\n');
    
    // Test için bir resim dosyası seç
    const testImagePath = path.join(__dirname, 'backend', 'uploads', 'products', '1753555113083-893862847-__izar_ka__arl___bazlama_tost.png');
    
    if (!fs.existsSync(testImagePath)) {
      console.error('❌ Test resmi bulunamadı:', testImagePath);
      return;
    }
    
    console.log('✅ Test resmi bulundu:', testImagePath);
    
    // FormData oluştur
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(testImagePath);
    formData.append('image', fileBuffer, {
      filename: 'test-upload.png',
      contentType: 'image/png'
    });
    
    console.log('🔍 Upload URL:', `${PRODUCTION_API_URL}/api/admin/upload-image`);
    console.log('🔍 FormData headers:', formData.getHeaders());
    
    // Upload isteği gönder
    const response = await axios.post(
      `${PRODUCTION_API_URL}/api/admin/upload-image`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Upload başarılı!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Upload hatası:', error.message);
    if (error.response) {
      console.error('📊 Error status:', error.response.status);
      console.error('📊 Error data:', error.response.data);
    }
  }
}

testImageUpload(); 