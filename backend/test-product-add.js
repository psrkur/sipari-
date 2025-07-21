const axios = require('axios');

async function testProductAdd() {
  try {
    console.log('🔧 Ürün ekleme testi başlıyor...');
    
    // Login
    console.log('🔐 Login yapılıyor...');
    const loginResponse = await axios.post('http://localhost:3006/api/auth/login', {
      email: 'admin@yemek5.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login başarılı, token alındı');
    
    // Ürün ekleme
    console.log('🍕 Ürün ekleniyor...');
    console.log('Token:', token);
    
    const productResponse = await axios.post('http://localhost:3006/api/admin/products', {
      name: 'Test Pizza',
      description: 'Test ürünü',
      price: 25.00,
      categoryId: 10,
      branchId: 9
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Ürün başarıyla eklendi:', productResponse.data);
    
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
  }
}

testProductAdd(); 