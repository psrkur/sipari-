// WhatsApp telefon numarasını güncelleme scripti
console.log('🔍 WhatsApp telefon numarası güncelleniyor...');

// Mevcut ayarları kontrol et
const currentSettings = localStorage.getItem('whatsAppSettings');

if (currentSettings) {
  try {
    const parsed = JSON.parse(currentSettings);
    console.log('🔍 Mevcut ayarlar:', parsed);
    
    // Telefon numarasını güncelle
    const updatedSettings = {
      ...parsed,
      phoneNumber: '905322922609'
    };
    
    console.log('🔍 Güncellenmiş ayarlar:', updatedSettings);
    
    // localStorage'a kaydet
    localStorage.setItem('whatsAppSettings', JSON.stringify(updatedSettings));
    
    console.log('✅ WhatsApp telefon numarası başarıyla güncellendi!');
    console.log('📱 Yeni numara: 905322922609');
    
  } catch (error) {
    console.error('❌ Ayarlar güncellenirken hata:', error);
  }
} else {
  console.log('⚠️ localStorage\'da WhatsApp ayarları bulunamadı');
  
  // Yeni ayarlar oluştur
  const newSettings = {
    phoneNumber: '905322922609',
    defaultMessage: 'Merhaba! Sipariş vermek istiyorum.',
    isActive: true
  };
  
  localStorage.setItem('whatsAppSettings', JSON.stringify(newSettings));
  console.log('✅ Yeni WhatsApp ayarları oluşturuldu!');
  console.log('📱 Telefon numarası: 905322922609');
}

// Sayfayı yenile
console.log('🔄 Sayfa yenileniyor...');
setTimeout(() => {
  window.location.reload();
}, 1000);
