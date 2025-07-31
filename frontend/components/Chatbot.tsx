'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api';

interface ChatMessage {
  id: number;
  message: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  responseType?: string;
}

interface ChatbotProps {
  customerId?: number;
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
}

export default function Chatbot({ customerId, customerInfo }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_BASE_URL = getApiBaseUrl();

  // Otomatik scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // İlk mesajı gönder
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage('Merhaba!');
    }
  }, [isOpen]);

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      message: message,
      direction: 'outgoing',
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Gelişmiş chatbot yanıtları (AI backend henüz hazır değil)
    setTimeout(() => {
      let botResponse: ChatMessage;
      const lowerMessage = message.toLowerCase();
      
      // Karşılama ve genel sorular
      if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
        const greetings = [
          `Merhaba ${customerInfo?.name ? customerInfo.name : 'değerli müşterimiz'}! 👋 Size nasıl yardımcı olabilirim? Sipariş vermek, menüyü görmek, teslimat süresi öğrenmek veya özel kampanyalarımız hakkında bilgi almak için sorabilirsiniz.`,
          'Selam! 😊 Hoş geldiniz! Bugün size nasıl yardımcı olabilirim? Yeni ürünlerimizi keşfetmek ister misiniz?',
          'Merhaba! 🍕 Lezzetli bir deneyim için buradayız! Hangi konuda yardıma ihtiyacınız var?'
        ];
        botResponse = {
          id: Date.now() + 1,
          message: greetings[Math.floor(Math.random() * greetings.length)],
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'general_greeting'
        };
      }
      // Sipariş durumu sorguları
      else if (lowerMessage.includes('sipariş') && (lowerMessage.includes('durum') || lowerMessage.includes('nerede') || lowerMessage.includes('geldi'))) {
        botResponse = {
          id: Date.now() + 1,
          message: 'Sipariş numaranızı paylaşır mısınız? (Örnek: ORD-12345) 📦 Siparişinizi takip etmek için numaranızı girmeniz yeterli.',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'order_status_inquiry'
        };
      }
      // Menü ve fiyat sorguları
      else if (lowerMessage.includes('menü') || lowerMessage.includes('fiyat') || lowerMessage.includes('ne var') || lowerMessage.includes('kategoriler')) {
        const menuResponses = [
          '🍕 Menümüzde pizza, burger, döner, salata ve içecek kategorileri bulunuyor. Hangi kategoriyi merak ediyorsunuz?',
          '📋 Güncel menümüzü görmek için web sitemizi ziyaret edebilirsiniz. "pizza", "burger", "döner" gibi kategorileri sorabilirsiniz.',
          '💰 Fiyatlarımız uygun ve kaliteli! Pizza 45-85 TL, Burger 35-65 TL, Döner 25-45 TL arasında. Hangi ürün hakkında detay istiyorsunuz?'
        ];
        botResponse = {
          id: Date.now() + 1,
          message: menuResponses[Math.floor(Math.random() * menuResponses.length)],
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'menu_inquiry'
        };
      }
      // Teslimat süresi
      else if (lowerMessage.includes('süre') || lowerMessage.includes('ne kadar') || lowerMessage.includes('kaç dakika') || lowerMessage.includes('zaman')) {
        const deliveryResponses = [
          '⏰ Teslimat süremiz ortalama 30-45 dakikadır. Yoğun saatlerde (12:00-14:00, 19:00-21:00) bu süre 60 dakikaya kadar uzayabilir.',
          '🚚 Hızlı teslimat garantisi! Normal şartlarda 30-45 dakika, yoğun saatlerde maksimum 60 dakika içinde kapınızda.',
          '📦 Siparişiniz hazırlandıktan sonra 15-20 dakika içinde kapınızda olacak. Toplam süre 30-45 dakika.'
        ];
        botResponse = {
          id: Date.now() + 1,
          message: deliveryResponses[Math.floor(Math.random() * deliveryResponses.length)],
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'delivery_time_inquiry'
        };
      }
      // Adres ve konum
      else if (lowerMessage.includes('adres') || lowerMessage.includes('nerede') || lowerMessage.includes('konum') || lowerMessage.includes('şube')) {
        botResponse = {
          id: Date.now() + 1,
          message: '📍 Şubemiz Kadıköy\'de bulunmaktadır. Teslimat hizmetimiz 5 km yarıçapında geçerlidir. Adres: Kadıköy Merkez, İstanbul. 📞 0212 XXX XX XX',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'address_inquiry'
        };
      }
      // Çalışma saatleri
      else if (lowerMessage.includes('saat') || lowerMessage.includes('açık') || lowerMessage.includes('kapanış') || lowerMessage.includes('çalışma')) {
        botResponse = {
          id: Date.now() + 1,
          message: '🕐 Her gün 10:00-23:00 saatleri arasında hizmet vermekteyiz. Online siparişler 24 saat alınmaktadır.',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'working_hours_inquiry'
        };
      }
      // Özel kampanyalar
      else if (lowerMessage.includes('kampanya') || lowerMessage.includes('indirim') || lowerMessage.includes('promosyon') || lowerMessage.includes('fırsat')) {
        const campaignResponses = [
          '🎉 Şu anda "2 Pizza Al 1 Pizza Bedava" kampanyamız devam ediyor! Detaylar için web sitemizi ziyaret edin.',
          '💥 Özel fırsat! İlk siparişinizde %20 indirim kazanın. Kupon kodu: HOSGELDIN20',
          '🔥 Hafta sonu özel! Cumartesi-Pazar tüm pizzalarda %15 indirim!'
        ];
        botResponse = {
          id: Date.now() + 1,
          message: campaignResponses[Math.floor(Math.random() * campaignResponses.length)],
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'campaign_inquiry'
        };
      }
      // Ödeme yöntemleri
      else if (lowerMessage.includes('ödeme') || lowerMessage.includes('kart') || lowerMessage.includes('nakit') || lowerMessage.includes('para')) {
        botResponse = {
          id: Date.now() + 1,
          message: '💳 Nakit, kredi kartı, banka kartı ve online ödeme kabul ediyoruz. Kapıda ödeme seçeneği de mevcuttur.',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'payment_inquiry'
        };
      }
      // Şikayet ve öneriler
      else if (lowerMessage.includes('şikayet') || lowerMessage.includes('problem') || lowerMessage.includes('sorun') || lowerMessage.includes('memnun değil')) {
        botResponse = {
          id: Date.now() + 1,
          message: '😔 Özür dileriz, yaşadığınız sorunu detaylandırabilir misiniz? Yöneticimiz sizinle iletişime geçecektir. 📞 0212 XXX XX XX',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'complaint'
        };
      }
      // Öneriler
      else if (lowerMessage.includes('öneri') || lowerMessage.includes('tavsiye') || lowerMessage.includes('ne önerirsin')) {
        const recommendationResponses = [
          '🍕 En popüler ürünlerimiz: Margherita Pizza, BBQ Burger, Tavuk Döner. Bunları denemenizi öneririm!',
          '⭐ Müşterilerimizin favorisi: Karışık Pizza, Beef Burger, Ayran. Bu kombinasyonu çok seviyorlar!',
          '🔥 Yeni ürünlerimiz: Truffle Pizza, Spicy Burger, Smoothie. Bunları mutlaka deneyin!'
        ];
        botResponse = {
          id: Date.now() + 1,
          message: recommendationResponses[Math.floor(Math.random() * recommendationResponses.length)],
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'recommendation'
        };
      }
      // Teşekkür
      else if (lowerMessage.includes('teşekkür') || lowerMessage.includes('sağol') || lowerMessage.includes('thanks')) {
        botResponse = {
          id: Date.now() + 1,
          message: 'Rica ederim! 😊 Başka bir konuda yardıma ihtiyacınız olursa buradayım. Afiyet olsun! 🍕',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'thanks'
        };
      }
      // Yardım
      else if (lowerMessage.includes('yardım') || lowerMessage.includes('help') || lowerMessage.includes('nasıl')) {
        botResponse = {
          id: Date.now() + 1,
          message: '🤝 Size nasıl yardımcı olabilirim?\n• Sipariş durumu sorgulama\n• Menü ve fiyat bilgisi\n• Teslimat süresi\n• Adres ve çalışma saatleri\n• Kampanyalar ve öneriler\n• Ödeme yöntemleri\n• Şikayet ve öneriler',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'help'
        };
      }
      // Genel yanıt
      else {
        const generalResponses = [
          'Anlıyorum! Size nasıl yardımcı olabilirim? Sipariş durumu, menü, teslimat süresi, kampanyalar gibi konularda sorabilirsiniz.',
          'İlginiz için teşekkürler! Hangi konuda bilgi almak istiyorsunuz? Menü, fiyat, teslimat veya kampanyalar hakkında sorabilirsiniz.',
          'Merak ettiğiniz konuyu belirtirseniz size daha detaylı bilgi verebilirim. Menü, sipariş, teslimat gibi konularda yardımcı olabilirim.'
        ];
        botResponse = {
          id: Date.now() + 1,
          message: generalResponses[Math.floor(Math.random() * generalResponses.length)],
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'general_response'
        };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const getResponseTypeColor = (type?: string) => {
    switch (type) {
      case 'order_status_inquiry':
        return 'bg-blue-100 text-blue-800';
      case 'menu_inquiry':
        return 'bg-green-100 text-green-800';
      case 'delivery_time_inquiry':
        return 'bg-yellow-100 text-yellow-800';
      case 'address_inquiry':
        return 'bg-purple-100 text-purple-800';
      case 'working_hours_inquiry':
        return 'bg-indigo-100 text-indigo-800';
      case 'campaign_inquiry':
        return 'bg-pink-100 text-pink-800';
      case 'payment_inquiry':
        return 'bg-emerald-100 text-emerald-800';
      case 'recommendation':
        return 'bg-orange-100 text-orange-800';
      case 'thanks':
        return 'bg-teal-100 text-teal-800';
      case 'help':
        return 'bg-cyan-100 text-cyan-800';
      case 'complaint':
        return 'bg-red-100 text-red-800';
      case 'general_greeting':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-full w-14 h-14 shadow-lg"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 h-96 bg-white rounded-lg shadow-2xl border">
          {/* Header */}
          <div className="bg-orange-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Sanal Asistan</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-orange-700 bg-transparent border-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-orange-700 bg-transparent border-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 h-64 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-3 flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.direction === 'outgoing'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  {message.responseType && (
                    <Badge className={`mt-1 text-xs ${getResponseTypeColor(message.responseType)}`}>
                      {message.responseType.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Mesajınızı yazın..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 