const jwt = require('jsonwebtoken');

// Test token'ı
const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AeWVtZWs1LmNvbSIsInJvbGUiOiJTVVBFUl9BRE1JTiIsImJyYW5jaElkIjpudWxsLCJpYXQiOjE3NTMwNDI5ODgsImV4cCI6MTc1MzEyOTM4OH0.9XPqoufsBk9h3y1C420Dxa2gDA5txco4BO0KGWPrYRg";

console.log('🔍 Token debug başlıyor...');
console.log('Token:', testToken);

try {
  const decoded = jwt.verify(testToken, 'your-super-secret-jwt-key-change-this-in-production');
  console.log('✅ Token geçerli:', decoded);
} catch (error) {
  console.error('❌ Token hatası:', error.message);
}

// Yeni token oluştur
const newToken = jwt.sign(
  { userId: 1, email: 'admin@yemek5.com', role: 'SUPER_ADMIN', branchId: null },
  'your-super-secret-jwt-key-change-this-in-production',
  { expiresIn: '24h' }
);

console.log('\n🆕 Yeni token:', newToken);

try {
  const decodedNew = jwt.verify(newToken, 'your-super-secret-jwt-key-change-this-in-production');
  console.log('✅ Yeni token geçerli:', decodedNew);
} catch (error) {
  console.error('❌ Yeni token hatası:', error.message);
} 