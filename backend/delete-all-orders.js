const axios = require('axios');

// Test script for deleting all orders
async function deleteAllOrders() {
  try {
    console.log('🗑️ Tüm siparişleri silme testi başlatılıyor...');
    
    // Admin token'ı (test için)
    const token = 'your-admin-token-here'; // Bu token'ı admin panelinden alabilirsiniz
    
    const response = await axios.delete('http://localhost:3001/api/admin/orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Başarılı!');
    console.log('📊 Sonuç:', response.data);
    
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
  }
}

// Script'i çalıştır
if (require.main === module) {
  deleteAllOrders();
}

module.exports = { deleteAllOrders }; 