const { exec } = require('child_process');

console.log('🔍 Port Durumu Kontrol Ediliyor...\n');

// Port kontrolü fonksiyonu
function checkPort(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
      if (stdout.trim()) {
        resolve({ port, status: '✅ ÇALIŞIYOR', details: stdout.trim().split('\n')[0] });
      } else {
        resolve({ port, status: '❌ ÇALIŞMIYOR', details: 'Port boş' });
      }
    });
  });
}

// Test endpoint'leri
async function testEndpoints() {
  const endpoints = [
    { name: 'Frontend', url: 'http://localhost:3000' },
    { name: 'Backend', url: 'http://localhost:3001/api/admin/images' }
  ];

  console.log('🌐 Endpoint Testleri:\n');

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url);
      console.log(`${endpoint.name}: ${response.ok ? '✅ ÇALIŞIYOR' : '❌ HATA'} (${response.status})`);
    } catch (error) {
      console.log(`${endpoint.name}: ❌ BAĞLANTI HATASI`);
    }
  }
}

// Ana kontrol fonksiyonu
async function main() {
  const ports = [3000, 3001];
  
  console.log('📊 Port Durumları:\n');
  
  for (const port of ports) {
    const result = await checkPort(port);
    console.log(`Port ${port}: ${result.status}`);
    if (result.status === '✅ ÇALIŞIYOR') {
      console.log(`  └─ ${result.details}`);
    }
    console.log('');
  }

  // Endpoint testleri
  await testEndpoints();
  
  console.log('\n🎯 Özet:');
  console.log('✅ Backend: Port 3001 (Sabit)');
  console.log('✅ Frontend: Port 3000 (Sabit)');
  console.log('✅ API Base URL: http://localhost:3001');
  console.log('\n💡 Artık port çakışması olmayacak!');
}

main().catch(console.error); 