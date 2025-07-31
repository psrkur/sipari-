const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// AI destekli chat mesajı alma
router.post('/ai-message', async (req, res) => {
  try {
    const { customerId, message, platform = 'web', customerInfo, conversationHistory } = req.body;
    
    console.log('🤖 AI Chat mesajı alındı:', { customerId, message, platform });

    // Müşteri bilgilerini kaydet/güncelle
    let customer = null;
    if (customerInfo) {
      customer = await prisma.customer.upsert({
        where: { phone: customerInfo.phone },
        update: {
          name: customerInfo.name,
          email: customerInfo.email,
          address: customerInfo.address
        },
        create: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          address: customerInfo.address
        }
      });
    }

    // Chat mesajını kaydet
    const chatMessage = await prisma.chatMessage.create({
      data: {
        customerId: customer?.id || customerId,
        message: message,
        platform: platform,
        direction: 'incoming',
        isProcessed: false
      }
    });

    // AI yanıtı oluştur
    const aiResponse = await generateAIResponse(message, conversationHistory, customer);

    // AI yanıtını kaydet
    await prisma.chatMessage.create({
      data: {
        customerId: customer?.id || customerId,
        message: aiResponse.message,
        platform: platform,
        direction: 'outgoing',
        isProcessed: true,
        responseType: aiResponse.type
      }
    });

    // Gerçek zamanlı bildirim gönder
    if (req.io) {
      req.io.emit('newChatMessage', {
        customerId: customer?.id || customerId,
        customerName: customer?.name || 'Müşteri',
        message: message,
        response: aiResponse.message,
        timestamp: new Date(),
        platform: platform
      });
    }

    res.json({
      success: true,
      response: aiResponse.message,
      responseType: aiResponse.type,
      customerId: customer?.id || customerId
    });

  } catch (error) {
    console.error('❌ AI Chat mesajı işleme hatası:', error);
    res.status(500).json({ error: 'AI mesajı işlenemedi' });
  }
});

// AI yanıt oluşturma fonksiyonu
async function generateAIResponse(message, conversationHistory, customer) {
  const lowerMessage = message.toLowerCase();
  
  // Sistem prompt'u oluştur
  const systemPrompt = `Sen bir fast food restoranının müşteri hizmetleri temsilcisisin. 
  
  Restoran Bilgileri:
  - Adres: Kadıköy Merkez, İstanbul
  - Çalışma Saatleri: 10:00-23:00 (Online siparişler 24 saat)
  - Teslimat Süresi: 30-45 dakika (yoğun saatlerde 60 dakika)
  - Teslimat Alanı: 5 km yarıçap
  - Ödeme: Nakit, kredi kartı, online ödeme, kapıda ödeme
  
  Menü Kategorileri:
  - Pizza: 45-85 TL (Margherita, Karışık, BBQ, Truffle)
  - Burger: 35-65 TL (Beef, BBQ, Spicy, Veggie)
  - Döner: 25-45 TL (Tavuk, Dana, Karışık)
  - Salata: 20-35 TL
  - İçecek: 8-15 TL
  
  Kampanyalar:
  - "2 Pizza Al 1 Pizza Bedava"
  - İlk sipariş %20 indirim (HOSGELDIN20)
  - Hafta sonu pizzalarda %15 indirim
  
  Müşteri Bilgileri: ${customer ? `Ad: ${customer.name}, Telefon: ${customer.phone}` : 'Yeni müşteri'}
  
  Konuşma Geçmişi: ${conversationHistory ? conversationHistory.map(m => `${m.direction}: ${m.message}`).join('\n') : 'Yeni konuşma'}
  
  Kurallar:
  1. Samimi ve yardımsever ol
  2. Emoji kullan (👋😊🍕📦⏰💳🎉)
  3. Detaylı bilgi ver
  4. Müşteri tercihlerini hatırla
  5. Kişiselleştirilmiş öneriler sun
  6. Türkçe yanıt ver
  7. Maksimum 200 kelime`;

  // Mesaj analizi ve yanıt oluşturma
  let response = '';
  let responseType = 'ai_response';

  // Karşılama
  if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
    response = `Merhaba ${customer?.name ? customer.name : 'değerli müşterimiz'}! 👋 Size nasıl yardımcı olabilirim? 
    
    🍕 Menümüzde pizza, burger, döner, salata ve içecek kategorileri bulunuyor.
    📦 Teslimat süremiz 30-45 dakika.
    🎉 Aktif kampanyalarımız var!
    
    Hangi konuda bilgi almak istiyorsunuz?`;
    responseType = 'greeting';
  }
  // Sipariş durumu
  else if (lowerMessage.includes('sipariş') && (lowerMessage.includes('durum') || lowerMessage.includes('nerede') || lowerMessage.includes('geldi'))) {
    response = `Sipariş numaranızı paylaşır mısınız? 📦 
    
    Örnek format: ORD-12345
    Siparişinizi takip etmek için numaranızı girmeniz yeterli.
    
    Eğer sipariş numaranız yoksa, telefon numaranızla da sorgulayabiliriz.`;
    responseType = 'order_status_inquiry';
  }
  // Menü sorgusu
  else if (lowerMessage.includes('menü') || lowerMessage.includes('fiyat') || lowerMessage.includes('ne var') || lowerMessage.includes('kategoriler')) {
    response = `🍕 Menümüzde şu kategoriler bulunuyor:
    
    • Pizza: 45-85 TL (Margherita, Karışık, BBQ, Truffle)
    • Burger: 35-65 TL (Beef, BBQ, Spicy, Veggie)  
    • Döner: 25-45 TL (Tavuk, Dana, Karışık)
    • Salata: 20-35 TL
    • İçecek: 8-15 TL
    
    Hangi kategori hakkında detay istiyorsunuz? Size özel öneriler de sunabilirim! 😊`;
    responseType = 'menu_inquiry';
  }
  // Teslimat süresi
  else if (lowerMessage.includes('süre') || lowerMessage.includes('ne kadar') || lowerMessage.includes('kaç dakika') || lowerMessage.includes('zaman')) {
    response = `⏰ Teslimat süremiz hakkında bilgi:
    
    • Normal süre: 30-45 dakika
    • Yoğun saatler (12:00-14:00, 19:00-21:00): 60 dakika
    • Hazırlama süresi: 15-20 dakika
    • Teslimat süresi: 15-25 dakika
    
    📍 Teslimat alanımız: Kadıköy merkez 5 km yarıçap
    
    Siparişinizi verdiğinizde size daha net bir süre verebiliriz!`;
    responseType = 'delivery_time_inquiry';
  }
  // Adres sorgusu
  else if (lowerMessage.includes('adres') || lowerMessage.includes('nerede') || lowerMessage.includes('konum') || lowerMessage.includes('şube')) {
    response = `📍 Şubemiz bilgileri:
    
    Adres: Kadıköy Merkez, İstanbul
    Telefon: 0212 XXX XX XX
    Teslimat Alanı: 5 km yarıçap
    
    🕐 Çalışma Saatleri: 10:00-23:00
    📦 Online siparişler: 24 saat
    
    Kadıköy'de misiniz? Teslimat hizmetimizden yararlanabilirsiniz!`;
    responseType = 'address_inquiry';
  }
  // Kampanya sorgusu
  else if (lowerMessage.includes('kampanya') || lowerMessage.includes('indirim') || lowerMessage.includes('promosyon') || lowerMessage.includes('fırsat')) {
    response = `🎉 Aktif kampanyalarımız:
    
    🔥 "2 Pizza Al 1 Pizza Bedava" - Devam ediyor!
    💥 İlk sipariş %20 indirim - Kupon: HOSGELDIN20
    🍕 Hafta sonu pizzalarda %15 indirim
    
    ${customer ? `${customer.name}, size özel fırsatlar da sunuyoruz!` : 'Yeni müşterilerimize özel indirimler!'}
    
    Detaylar için web sitemizi ziyaret edebilirsiniz.`;
    responseType = 'campaign_inquiry';
  }
  // Ödeme yöntemleri
  else if (lowerMessage.includes('ödeme') || lowerMessage.includes('kart') || lowerMessage.includes('nakit') || lowerMessage.includes('para')) {
    response = `💳 Ödeme seçeneklerimiz:
    
    • Nakit ödeme
    • Kredi kartı
    • Banka kartı  
    • Online ödeme
    • Kapıda ödeme
    
    Tüm kartlarda taksit seçeneği mevcuttur.
    Güvenli ödeme altyapımız ile güvenle alışveriş yapabilirsiniz!`;
    responseType = 'payment_inquiry';
  }
  // Öneriler
  else if (lowerMessage.includes('öneri') || lowerMessage.includes('tavsiye') || lowerMessage.includes('ne önerirsin')) {
    response = `⭐ Size özel önerilerim:
    
    🍕 En popüler: Margherita Pizza + Ayran
    🍔 Müşteri favorisi: BBQ Burger + Patates
    🥙 Yeni ürün: Truffle Pizza + Smoothie
    
    ${customer ? `${customer.name}, daha önce sipariş verdiğiniz ürünlere benzer öneriler de sunabilirim!` : 'İlk siparişiniz için özel menü önerilerimiz var!'}
    
    Hangi kategoriyi tercih edersiniz?`;
    responseType = 'recommendation';
  }
  // Şikayet
  else if (lowerMessage.includes('şikayet') || lowerMessage.includes('problem') || lowerMessage.includes('sorun') || lowerMessage.includes('memnun değil')) {
    response = `😔 Yaşadığınız sorun için özür dileriz.
    
    Sorununuzu detaylandırabilir misiniz? Size en kısa sürede dönüş yapacağız.
    
    📞 Direkt iletişim: 0212 XXX XX XX
    📧 E-posta: info@restoran.com
    
    ${customer ? `${customer.name}, sorununuzu çözmek için elimizden geleni yapacağız.` : 'Müşteri memnuniyeti bizim için çok önemli.'}`;
    responseType = 'complaint';
  }
  // Teşekkür
  else if (lowerMessage.includes('teşekkür') || lowerMessage.includes('sağol') || lowerMessage.includes('thanks')) {
    response = `Rica ederim ${customer?.name ? customer.name : 'değerli müşterimiz'}! 😊
    
    Başka bir konuda yardıma ihtiyacınız olursa buradayım.
    Afiyet olsun! 🍕
    
    Yorumlarınız bizim için çok değerli.`;
    responseType = 'thanks';
  }
  // Yardım
  else if (lowerMessage.includes('yardım') || lowerMessage.includes('help') || lowerMessage.includes('nasıl')) {
    response = `🤝 Size nasıl yardımcı olabilirim?
    
    📋 Hizmetlerimiz:
    • Sipariş durumu sorgulama
    • Menü ve fiyat bilgisi
    • Teslimat süresi ve adres
    • Kampanyalar ve öneriler
    • Ödeme yöntemleri
    • Şikayet ve öneriler
    
    Hangi konuda bilgi almak istiyorsunuz?`;
    responseType = 'help';
  }
  // Genel yanıt
  else {
    response = `Anlıyorum! Size nasıl yardımcı olabilirim?
    
    🍕 Menü ve fiyat bilgisi
    📦 Sipariş durumu sorgulama
    ⏰ Teslimat süresi
    🎉 Kampanyalar
    💳 Ödeme yöntemleri
    📍 Adres ve çalışma saatleri
    
    Hangi konuda detay istiyorsunuz?`;
    responseType = 'general_response';
  }

  return {
    message: response,
    type: responseType
  };
}

module.exports = router; 