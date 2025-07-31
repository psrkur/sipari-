const https = require('https');

// Test 1: Ana endpoint
const testMainEndpoint = () => {
  const options = {
    hostname: 'yemek5-backend.onrender.com',
    port: 443,
    path: '/api/health',
    method: 'GET'
  };

  console.log('🔄 Test 1: Ana endpoint kontrol ediliyor...');
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', responseData);
      testOrdersEndpoint();
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.end();
};

// Test 2: Orders endpoint
const testOrdersEndpoint = () => {
  const options = {
    hostname: 'yemek5-backend.onrender.com',
    port: 443,
    path: '/api/orders',
    method: 'GET'
  };

  console.log('\n🔄 Test 2: Orders endpoint kontrol ediliyor...');
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', responseData.substring(0, 200) + '...');
      testChatbotEndpoint();
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.end();
};

// Test 3: Chatbot endpoint
const testChatbotEndpoint = () => {
  const options = {
    hostname: 'yemek5-backend.onrender.com',
    port: 443,
    path: '/api/chatbot/chat/stats',
    method: 'GET'
  };

  console.log('\n🔄 Test 3: Chatbot endpoint kontrol ediliyor...');
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', responseData);
      console.log('\n✅ Tüm testler tamamlandı!');
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.end();
};

testMainEndpoint(); 