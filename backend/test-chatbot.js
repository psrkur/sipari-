const https = require('https');

const data = JSON.stringify({
  customerId: 1,
  message: 'merhaba',
  platform: 'web'
});

const options = {
  hostname: 'yemek5-backend.onrender.com',
  port: 443,
  path: '/api/chatbot/chat/message',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end(); 