const https = require('https');

// Test 1: Basit mesaj
const test1 = () => {
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

  console.log('🔄 Test 1: Basit mesaj gönderiliyor...');
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', responseData);
      test2();
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(data);
  req.end();
};

// Test 2: Müşteri bilgileri ile
const test2 = () => {
  const data = JSON.stringify({
    customerId: 1,
    message: 'sipariş durumu',
    platform: 'web',
    customerInfo: {
      name: 'Test Müşteri',
      phone: '5551234567',
      email: 'test@example.com'
    }
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

  console.log('\n🔄 Test 2: Müşteri bilgileri ile mesaj gönderiliyor...');
  
  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', responseData);
      test3();
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(data);
  req.end();
};

// Test 3: API endpoint kontrolü
const test3 = () => {
  const options = {
    hostname: 'yemek5-backend.onrender.com',
    port: 443,
    path: '/api/chatbot/chat/stats',
    method: 'GET'
  };

  console.log('\n🔄 Test 3: Chat stats endpoint kontrol ediliyor...');
  
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

test1(); 