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
  const [conversationContext, setConversationContext] = useState({
    lastTopic: '',
    customerPreferences: [] as string[],
    orderHistory: [] as string[],
    currentInquiry: ''
  });
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

  // Akıllı yanıt sistemi
  const generateIntelligentResponse = (message: string, context: any) => {
    const lowerMessage = message.toLowerCase();
    const customerName = customerInfo?.name || 'değerli müşterimiz';
    
    // Konuşma bağlamını güncelle
    let newContext = { ...context };
    
    // Karşılama ve tanışma
    if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
      const timeOfDay = new Date().getHours();
      let greeting = '';
      
      if (timeOfDay < 12) {
        greeting = `Günaydın ${customerName}! ☀️`;
      } else if (timeOfDay < 18) {
        greeting = `İyi günler ${customerName}! 🌤️`;
      } else {
        greeting = `İyi akşamlar ${customerName}! 🌙`;
      }
      
      return {
        message: `${greeting} Size nasıl yardımcı olabilirim? Bugün özel menümüzde yeni eklenen Truffle Pizza ve Spicy Burger var. Hangi konuda bilgi almak istersiniz?`,
        responseType: 'intelligent_greeting',
        context: { ...newContext, lastTopic: 'greeting' }
      };
    }
    
    // Menü sorguları - daha akıllı
    if (lowerMessage.includes('menü') || lowerMessage.includes('ne var') || lowerMessage.includes('yemek')) {
      const responses = [
        `🍽️ ${customerName}, menümüzde 5 ana kategori bulunuyor:\n\n🍕 **Pizzalar** (45-85 TL): Margherita, Karışık, Pepperoni, BBQ Chicken, Truffle\n🍔 **Burgerler** (35-65 TL): Beef, Chicken, BBQ, Spicy, Deluxe\n🥙 **Dönerler** (25-45 TL): Tavuk, Et, Karışık, Özel\n🥗 **Salatalar** (20-35 TL): Sezar, Akdeniz, Tavuklu\n🥤 **İçecekler** (5-15 TL): Kola, Su, Ayran, Smoothie, Milkshake\n\nHangi kategori hakkında detay istiyorsunuz?`,
        `📋 ${customerName}, güncel menümüzü keşfedelim! Size özel önerilerim:\n\n🔥 **Yeni Eklenenler**: Truffle Pizza (85 TL), Spicy Burger (50 TL)\n⭐ **En Popüler**: Karışık Pizza (65 TL), BBQ Burger (45 TL)\n💡 **Önerim**: Margherita Pizza + Ayran kombinasyonu\n\nHangi ürün hakkında bilgi almak istersiniz?`
      ];
      
      return {
        message: responses[Math.floor(Math.random() * responses.length)],
        responseType: 'intelligent_menu_inquiry',
        context: { ...newContext, lastTopic: 'menu', currentInquiry: 'menu' }
      };
    }
    
    // Spesifik ürün sorguları - bağlam bazlı
    if (lowerMessage.includes('pizza')) {
      const pizzaPreferences = context.customerPreferences.filter(p => p.includes('pizza'));
      let response = '';
      
      if (pizzaPreferences.length > 0) {
        response = `🍕 ${customerName}, daha önce ${pizzaPreferences[0]} denemiştiniz! Size özel önerilerim:\n\n`;
      } else {
        response = `🍕 ${customerName}, pizzalarımız hakkında detaylı bilgi:\n\n`;
      }
      
      response += `**Margherita** (45 TL): Taze mozzarella, domates sosu, fesleğen\n**Karışık** (65 TL): Sucuk, sosis, mantar, biber, zeytin\n**Pepperoni** (55 TL): Pepperoni, mozzarella, domates sosu\n**BBQ Chicken** (75 TL): Tavuk, BBQ sosu, soğan, mısır\n**Truffle** (85 TL): Trüf mantarı, parmesan, roka\n\nHangi pizzayı denemek istersiniz?`;
      
      return {
        message: response,
        responseType: 'intelligent_pizza_inquiry',
        context: { ...newContext, lastTopic: 'pizza', currentInquiry: 'pizza' }
      };
    }
    
    // Fiyat sorguları - dinamik
    if (lowerMessage.includes('fiyat') || lowerMessage.includes('ne kadar')) {
      const responses = [
        `💰 ${customerName}, fiyatlarımız şu şekilde:\n\n🍕 **Pizzalar**: 45-85 TL (Margherita en uygun, Truffle premium)\n🍔 **Burgerler**: 35-65 TL (Beef en uygun, Deluxe premium)\n🥙 **Dönerler**: 25-45 TL (Tavuk en uygun, Özel premium)\n🥤 **İçecekler**: 5-15 TL\n\nBütçenize uygun önerilerim var. Hangi kategori hakkında detay istiyorsunuz?`,
        `💡 ${customerName}, bütçe dostu önerilerim:\n\n**En Uygun**: Margherita Pizza (45 TL) + Su (5 TL) = 50 TL\n**Orta Segment**: Karışık Pizza (65 TL) + Kola (8 TL) = 73 TL\n**Premium**: Truffle Pizza (85 TL) + Smoothie (12 TL) = 97 TL\n\nHangi bütçe aralığında öneri istiyorsunuz?`
      ];
      
      return {
        message: responses[Math.floor(Math.random() * responses.length)],
        responseType: 'intelligent_price_inquiry',
        context: { ...newContext, lastTopic: 'price', currentInquiry: 'price' }
      };
    }
    
    // Teslimat sorguları - konum bazlı
    if (lowerMessage.includes('süre') || lowerMessage.includes('ne kadar') || lowerMessage.includes('kaç dakika')) {
      const customerAddress = customerInfo?.address;
      let deliveryTime = '30-45 dakika';
      let specialNote = '';
      
      if (customerAddress) {
        if (customerAddress.includes('Kadıköy')) {
          deliveryTime = '20-30 dakika';
          specialNote = 'Kadıköy\'de olduğunuz için hızlı teslimat!';
        } else if (customerAddress.includes('Üsküdar')) {
          deliveryTime = '25-35 dakika';
          specialNote = 'Üsküdar\'da olduğunuz için orta hızda teslimat.';
        } else {
          deliveryTime = '35-50 dakika';
          specialNote = 'Biraz uzak olduğunuz için teslimat süresi uzayabilir.';
        }
      }
      
      return {
        message: `⏰ ${customerName}, teslimat süreniz: **${deliveryTime}**\n\n${specialNote}\n\n🚚 **Teslimat Detayları**:\n• Normal saatler: 30-45 dakika\n• Yoğun saatler (12:00-14:00, 19:00-21:00): 45-60 dakika\n• Hava durumu etkisi: +10-15 dakika\n\n📍 **Teslimat Alanı**: Kadıköy merkez ve çevresi (5 km)\n\nSipariş vermek ister misiniz?`,
        responseType: 'intelligent_delivery_inquiry',
        context: { ...newContext, lastTopic: 'delivery', currentInquiry: 'delivery' }
      };
    }
    
    // Kampanya sorguları - kişiselleştirilmiş
    if (lowerMessage.includes('kampanya') || lowerMessage.includes('indirim') || lowerMessage.includes('promosyon')) {
      const responses = [
        `🎉 ${customerName}, size özel kampanyalarımız:\n\n🔥 **Yeni Müşteri**: İlk siparişinizde %20 indirim! Kupon: HOSGELDIN20\n🍕 **Pizza Kampanyası**: 2 Pizza Al, 1 Pizza Bedava (hafta sonu)\n💳 **Kredi Kartı**: Garanti Bankası kartlarıyla %10 indirim\n📱 **Mobil Uygulama**: Uygulama üzerinden siparişlerde %5 indirim\n\nHangi kampanyadan yararlanmak istersiniz?`,
        `💥 ${customerName}, güncel fırsatlarımız:\n\n⭐ **Öğrenci İndirimi**: Öğrenci kimliği ile %15 indirim\n👥 **Grup Siparişi**: 3+ ürün siparişlerinde %10 indirim\n🎂 **Doğum Günü**: Doğum gününüzde ücretsiz tatlı\n🌙 **Gece Kampanyası**: 22:00-24:00 arası %25 indirim\n\nHangi kampanya ilginizi çekiyor?`
      ];
      
      return {
        message: responses[Math.floor(Math.random() * responses.length)],
        responseType: 'intelligent_campaign_inquiry',
        context: { ...newContext, lastTopic: 'campaign', currentInquiry: 'campaign' }
      };
    }
    
    // Öneriler - akıllı
    if (lowerMessage.includes('öneri') || lowerMessage.includes('tavsiye') || lowerMessage.includes('ne önerirsin')) {
      const timeOfDay = new Date().getHours();
      let recommendation = '';
      
      if (timeOfDay < 12) {
        recommendation = `🌅 ${customerName}, sabah için önerilerim:\n\n🍕 **Kahvaltı Sonrası**: Margherita Pizza (hafif ve lezzetli)\n🥤 **Enerji İçin**: Smoothie (taze meyve)\n💡 **Kombinasyon**: Margherita + Smoothie = 57 TL\n\nSabah için ideal seçimler!`;
      } else if (timeOfDay < 18) {
        recommendation = `☀️ ${customerName}, öğle için önerilerim:\n\n🍔 **Doyurucu**: BBQ Burger + Kola = 53 TL\n🍕 **Klasik**: Karışık Pizza + Ayran = 71 TL\n🥙 **Hızlı**: Tavuk Döner + Su = 30 TL\n\nÖğle yemeği için mükemmel seçenekler!`;
      } else {
        recommendation = `🌙 ${customerName}, akşam için önerilerim:\n\n🍕 **Premium**: Truffle Pizza + Smoothie = 97 TL\n🍔 **Lezzetli**: Deluxe Burger + Milkshake = 80 TL\n🥙 **Özel**: Özel Döner + Kola = 53 TL\n\nAkşam yemeği için özel seçenekler!`;
      }
      
      return {
        message: recommendation,
        responseType: 'intelligent_recommendation',
        context: { ...newContext, lastTopic: 'recommendation', currentInquiry: 'recommendation' }
      };
    }
    
    // Genel yanıt - bağlam bazlı
    const contextResponses = [
      `🤔 ${customerName}, anladığım kadarıyla ${context.lastTopic || 'genel'} konusuyla ilgileniyorsunuz. Size daha spesifik yardım edebilmem için:\n\n• Hangi ürün kategorisi hakkında bilgi istiyorsunuz?\n• Fiyat aralığınız nedir?\n• Teslimat süresi önemli mi?\n• Özel bir kampanya arıyor musunuz?`,
      `💭 ${customerName}, size daha iyi yardım edebilmem için biraz daha detay verebilir misiniz?\n\nÖrneğin:\n• "Pizza fiyatları nedir?"\n• "En uygun burger hangisi?"\n• "Teslimat ne kadar sürer?"\n• "Hangi kampanyalar var?"\n\nBu şekilde size özel öneriler sunabilirim.`
    ];
    
    return {
      message: contextResponses[Math.floor(Math.random() * contextResponses.length)],
      responseType: 'intelligent_context_response',
      context: { ...newContext, lastTopic: 'general' }
    };
  };

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

    // Akıllı yanıt sistemi
    setTimeout(() => {
      const intelligentResponse = generateIntelligentResponse(message, conversationContext);
      
      const botResponse: ChatMessage = {
        id: Date.now() + 1,
        message: intelligentResponse.message,
        direction: 'incoming',
        createdAt: new Date().toISOString(),
        responseType: intelligentResponse.responseType
      };

      setMessages(prev => [...prev, botResponse]);
      setConversationContext(intelligentResponse.context);
      setIsLoading(false);
    }, 1500); // Biraz daha uzun süre AI hissi için
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const getResponseTypeColor = (type?: string) => {
    switch (type) {
      case 'intelligent_greeting':
        return 'bg-blue-100 text-blue-800';
      case 'intelligent_menu_inquiry':
        return 'bg-green-100 text-green-800';
      case 'intelligent_pizza_inquiry':
        return 'bg-red-100 text-red-800';
      case 'intelligent_price_inquiry':
        return 'bg-yellow-100 text-yellow-800';
      case 'intelligent_delivery_inquiry':
        return 'bg-purple-100 text-purple-800';
      case 'intelligent_campaign_inquiry':
        return 'bg-pink-100 text-pink-800';
      case 'intelligent_recommendation':
        return 'bg-orange-100 text-orange-800';
      case 'intelligent_context_response':
        return 'bg-cyan-100 text-cyan-800';
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
              <span className="font-semibold">AI Asistan</span>
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
                  <p className="text-sm whitespace-pre-line">{message.message}</p>
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
                placeholder="AI Asistan'a sorun..."
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