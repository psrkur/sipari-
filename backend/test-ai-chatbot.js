const https = require('https');

const data = JSON.stringify({
  customerId: 1,
  message: 'merhaba',
  platform: 'web',
  customerInfo: {
    name: 'Test Müşteri',
    phone: '5551234567',
    email: 'test@example.com'
  },
  conversationHistory: []
});

const options = {
  hostname: 'yemek5-backend.onrender.com',
  port: 443,
  path: '/api/chatbot/ai-message',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🔄 AI Chatbot test ediliyor...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    console.log('✅ AI Chatbot test tamamlandı!');
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end(); 