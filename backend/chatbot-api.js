const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// Chat mesajı alma
router.post('/chat/message', async (req, res) => {
  try {
    const { customerId, message, platform = 'web', customerInfo } = req.body;
    
    console.log('📱 Chat mesajı alındı:', { customerId, message, platform });

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

    // Mesajı analiz et ve yanıt oluştur
    const response = await processChatMessage(message, customer);

    // Yanıtı kaydet
    await prisma.chatMessage.create({
      data: {
        customerId: customer?.id || customerId,
        message: response.message,
        platform: platform,
        direction: 'outgoing',
        isProcessed: true,
        responseType: response.type
      }
    });

    // Gerçek zamanlı bildirim gönder
    if (req.io) {
      req.io.emit('newChatMessage', {
        customerId: customer?.id || customerId,
        customerName: customer?.name || 'Müşteri',
        message: message,
        response: response.message,
        timestamp: new Date(),
        platform: platform
      });
    }

    res.json({
      success: true,
      response: response.message,
      responseType: response.type,
      customerId: customer?.id || customerId
    });

  } catch (error) {
    console.error('❌ Chat mesajı işleme hatası:', error);
    res.status(500).json({ error: 'Mesaj işlenemedi' });
  }
});

// Chat mesajlarını getir
router.get('/chat/messages/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const messages = await prisma.chatMessage.findMany({
      where: { customerId: parseInt(customerId) },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('❌ Chat mesajları getirme hatası:', error);
    res.status(500).json({ error: 'Mesajlar getirilemedi' });
  }
});

// Chat istatistikleri
router.get('/chat/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await prisma.chatMessage.groupBy({
      by: ['direction'],
      where: {
        createdAt: {
          gte: today
        }
      },
      _count: {
        id: true
      }
    });

    const totalMessages = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const incomingMessages = stats.find(s => s.direction === 'incoming')?._count.id || 0;
    const outgoingMessages = stats.find(s => s.direction === 'outgoing')?._count.id || 0;

    res.json({
      totalMessages,
      incomingMessages,
      outgoingMessages,
      date: today
    });
  } catch (error) {
    console.error('❌ Chat istatistikleri hatası:', error);
    res.status(500).json({ error: 'İstatistikler getirilemedi' });
  }
});

// Mesaj işleme fonksiyonu
async function processChatMessage(message, customer) {
  const lowerMessage = message.toLowerCase();
  
  // Sipariş durumu sorgusu
  if (lowerMessage.includes('sipariş') && (lowerMessage.includes('durum') || lowerMessage.includes('nerede'))) {
    return {
      message: 'Sipariş numaranızı paylaşır mısınız? (Örnek: ORD-12345)',
      type: 'order_status_inquiry'
    };
  }

  // Menü sorgusu
  if (lowerMessage.includes('menü') || lowerMessage.includes('fiyat') || lowerMessage.includes('ne var')) {
    return {
      message: 'Menümüzü görmek için web sitemizi ziyaret edebilir veya "pizza", "burger", "içecek" gibi kategorileri sorabilirsiniz.',
      type: 'menu_inquiry'
    };
  }

  // Sipariş verme
  if (lowerMessage.includes('sipariş') && lowerMessage.includes('ver')) {
    return {
      message: 'Harika! Hangi ürünü istiyorsunuz? (Örnek: pizza, burger, içecek)',
      type: 'order_intent'
    };
  }

  // Teslimat süresi
  if (lowerMessage.includes('süre') || lowerMessage.includes('ne kadar') || lowerMessage.includes('kaç dakika')) {
    return {
      message: 'Teslimat süremiz ortalama 30-45 dakikadır. Yoğun saatlerde bu süre uzayabilir.',
      type: 'delivery_time_inquiry'
    };
  }

  // Adres sorgusu
  if (lowerMessage.includes('adres') || lowerMessage.includes('nerede')) {
    return {
      message: 'Şubemiz Kadıköy\'de bulunmaktadır. Teslimat hizmetimiz 5 km yarıçapında geçerlidir.',
      type: 'address_inquiry'
    };
  }

  // Çalışma saatleri
  if (lowerMessage.includes('saat') || lowerMessage.includes('açık') || lowerMessage.includes('kapanış')) {
    return {
      message: 'Her gün 10:00-23:00 saatleri arasında hizmet vermekteyiz.',
      type: 'working_hours_inquiry'
    };
  }

  // Şikayet
  if (lowerMessage.includes('şikayet') || lowerMessage.includes('problem') || lowerMessage.includes('sorun')) {
    return {
      message: 'Özür dileriz. Sorununuzu detaylandırabilir misiniz? Yöneticimiz sizinle iletişime geçecektir.',
      type: 'complaint'
    };
  }

  // Genel yanıt
  return {
    message: 'Merhaba! Size nasıl yardımcı olabilirim? Sipariş vermek, menüyü görmek veya teslimat süresi öğrenmek için sorabilirsiniz.',
    type: 'general_greeting'
  };
}

module.exports = router; 