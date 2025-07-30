const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('🔍 authenticateToken çağrıldı');
  const authHeader = req.headers['authorization'];
  console.log('🔍 Authorization header:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  console.log('🔍 Token:', token);
  
  if (!token) {
    console.log('❌ Token yok');
    return res.status(401).json({ error: 'Token gerekli' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production', (err, user) => {
    if (err) {
      console.log('❌ Token hatası:', err.message);
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    console.log('✅ Token geçerli, user:', user);
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken
}; 