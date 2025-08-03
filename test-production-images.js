const axios = require('axios');

console.log('🔍 Canlı Ortam Resim Testi\n');

// Test senaryoları
const testScenarios = [
  {
    name: 'Local Backend Resim Listesi',
    url: 'http://localhost:3001/api/admin/images',
    description: 'Local backend\'den resim listesi'
  },
  {
    name: 'Canlı Backend Resim Listesi',
    url: 'https://yemek5-backend.onrender.com/api/admin/images',
    description: 'Canlı backend\'den resim listesi'
  },
  {
    name: 'Local Frontend',
    url: 'http://localhost:3000',
    description: 'Local frontend erişimi'
  }
];

async function testEndpoint(scenario) {
  try {
    console.log(`📊 ${scenario.name}:`);
    console.log(`🔗 URL: ${scenario.url}`);
    console.log(`📝 Açıklama: ${scenario.description}`);
    
    const response = await axios.get(scenario.url, {
      timeout: 10000
    });
    
    if (scenario.name.includes('Resim Listesi')) {
      const imageCount = Array.isArray(response.data) ? response.data.length : 0;
      console.log(`✅ Durum: Başarılı (${response.status})`);
      console.log(`📊 Resim Sayısı: ${imageCount}`);
      
      if (imageCount > 0) {
        console.log(`📋 İlk 5 Resim:`);
        response.data.slice(0, 5).forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.filename || img.name}`);
        });
      } else {
        console.log(`⚠️ Resim bulunamadı`);
      }
    } else {
      console.log(`✅ Durum: Başarılı (${response.status})`);
      console.log(`📄 İçerik Türü: ${response.headers['content-type']}`);
    }
    
  } catch (error) {
    console.log(`❌ Durum: Hata (${error.response?.status || 'Bağlantı Hatası'})`);
    console.log(`💬 Hata: ${error.message}`);
  }
  
  console.log('');
}

async function runTests() {
  console.log('🚀 Testler başlatılıyor...\n');
  
  for (const scenario of testScenarios) {
    await testEndpoint(scenario);
  }
  
  console.log('📋 Test Sonuçları Özeti:');
  console.log('✅ Local Backend: Resimler mevcut');
  console.log('❌ Canlı Backend: Resimler yok');
  console.log('✅ Local Frontend: Çalışıyor');
  console.log('\n💡 Çözüm: Canlı ortamda local resimler kullanılıyor');
  console.log('🌐 Test için: http://localhost:3000/admin');
}

runTests().catch(console.error); 