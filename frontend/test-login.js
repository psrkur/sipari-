// Frontend login test script
const testLogin = async () => {
  try {
    console.log('🔍 Frontend login test başlatılıyor...');
    
    const loginData = {
      email: 'test@yemek5.com',
      password: 'test123'
    };
    
    console.log('📤 Login data:', loginData);
    
    const response = await fetch('https://yemek5-backend.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Login hatası:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Login başarılı:', data);
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  }
};

// Test'i çalıştır
testLogin(); 