'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api';
import { safeObjectEntries, safeObjectKeys } from '@/lib/utils';

interface ChatMessage {
  id: number;
  message: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  responseType?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  category: {
    name: string;
  };
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
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
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

  // Ürünleri yükle
  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        // Varsayılan olarak ilk şubeyi kullan (branchId: 1)
        const response = await axios.get(`${getApiBaseUrl()}/api/products/1`);
        setProducts(response.data);
        console.log('✅ Ürünler yüklendi:', response.data.length);
      } catch (error) {
        console.error('❌ Ürünler yüklenemedi:', error);
        // Hata durumunda boş array kullan
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]); // Sadece isOpen'ı dependency olarak kullan

  // İlk mesajı gönder
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage('Merhaba!');
    }
  }, [isOpen]);

  // Ürünleri kategorilere ayır
  const getProductsByCategory = () => {
    const categories: { [key: string]: Product[] } = {};
    
    products.forEach(product => {
      const categoryName = product.category?.name || 'Diğer';
      if (!categories[categoryName]) {
        categories[categoryName] = [];
      }
      categories[categoryName].push(product);
    });
    
    return categories;
  };

  // Fiyat aralığını hesapla
  const getPriceRange = (categoryProducts: Product[]) => {
    if (categoryProducts.length === 0) return '0-0 TL';
    
    const prices = categoryProducts.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return `${min}-${max} TL`;
  };

  // Akıllı yanıt sistemi
  const generateIntelligentResponse = (message: string, context: any) => {
    const lowerMessage = message.toLowerCase();
    const customerName = customerInfo?.name || 'değerli müşterimiz';
    const categories = getProductsByCategory();
    
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
      
      const categoryNames = safeObjectKeys(categories);
      const availableCategories = categoryNames.length > 0 ? categoryNames.join(', ') : 'ürünlerimiz';
      
      return {
        message: `${greeting} Size nasıl yardımcı olabilirim? Menümüzde ${availableCategories} bulunuyor. Hangi kategori hakkında bilgi almak istersiniz?`,
        responseType: 'intelligent_greeting',
        context: { ...newContext, lastTopic: 'greeting' }
      };
    }
    
    // Menü sorguları - gerçek verilerle
    if (lowerMessage.includes('menü') || lowerMessage.includes('ne var') || lowerMessage.includes('yemek')) {
      if (products.length === 0) {
        return {
          message: `📋 ${customerName}, şu anda menümüz yükleniyor. Lütfen birkaç saniye bekleyin ve tekrar sorun.`,
          responseType: 'intelligent_menu_inquiry',
          context: { ...newContext, lastTopic: 'menu', currentInquiry: 'menu' }
        };
      }

      const categoryList = safeObjectEntries(categories).map(([categoryName, categoryProducts]: [string, any[]]) => {
        const priceRange = getPriceRange(categoryProducts);
        const productNames = categoryProducts.slice(0, 3).map((p: any) => p.name).join(', ');
        return `🍽️ **${categoryName}** (${priceRange}): ${productNames}${categoryProducts.length > 3 ? '...' : ''}`;
      }).join('\n');

      return {
        message: `🍽️ ${customerName}, güncel menümüz:\n\n${categoryList}\n\nHangi kategori hakkında detay istiyorsunuz?`,
        responseType: 'intelligent_menu_inquiry',
        context: { ...newContext, lastTopic: 'menu', currentInquiry: 'menu' }
      };
    }
    
    // Spesifik kategori sorguları
    const categoryMatch = safeObjectKeys(categories).find(category => 
      lowerMessage.includes(category.toLowerCase())
    );
    
    if (categoryMatch) {
      const categoryProducts = categories[categoryMatch];
      const priceRange = getPriceRange(categoryProducts);
      
      const productList = categoryProducts.map(product => 
        `**${product.name}** (${product.price} TL)${product.description ? `: ${product.description}` : ''}`
      ).join('\n');
      
      return {
        message: `🍽️ ${customerName}, ${categoryMatch} kategorimiz:\n\n${productList}\n\nHangi ürünü denemek istersiniz?`,
        responseType: 'intelligent_category_inquiry',
        context: { ...newContext, lastTopic: categoryMatch.toLowerCase(), currentInquiry: 'category' }
      };
    }
    
    // Fiyat sorguları - gerçek verilerle
    if (lowerMessage.includes('fiyat') || lowerMessage.includes('ne kadar')) {
      if (products.length === 0) {
        return {
          message: `💰 ${customerName}, şu anda fiyat bilgileri yükleniyor. Lütfen birkaç saniye bekleyin.`,
          responseType: 'intelligent_price_inquiry',
          context: { ...newContext, lastTopic: 'price', currentInquiry: 'price' }
        };
      }

      const priceRanges = safeObjectEntries(categories).map(([categoryName, categoryProducts]: [string, any[]]) => {
        const priceRange = getPriceRange(categoryProducts);
        return `🍽️ **${categoryName}**: ${priceRange}`;
      }).join('\n');

      const allPrices = products.map(p => p.price);
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);

      return {
        message: `💰 ${customerName}, fiyatlarımız:\n\n${priceRanges}\n\n💡 **Genel Fiyat Aralığı**: ${minPrice}-${maxPrice} TL\n\nHangi kategori hakkında detay istiyorsunuz?`,
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
    
    // Öneriler - gerçek ürünlerle
    if (lowerMessage.includes('öneri') || lowerMessage.includes('tavsiye') || lowerMessage.includes('ne önerirsin')) {
      if (products.length === 0) {
        return {
          message: `💡 ${customerName}, şu anda ürün önerileri yükleniyor. Lütfen birkaç saniye bekleyin.`,
          responseType: 'intelligent_recommendation',
          context: { ...newContext, lastTopic: 'recommendation', currentInquiry: 'recommendation' }
        };
      }

      const timeOfDay = new Date().getHours();
      let recommendation = '';
      
      // En popüler ürünleri seç (fiyat ortalamasına göre)
      const sortedProducts = [...products].sort((a, b) => a.price - b.price);
      const affordableProducts = sortedProducts.slice(0, 3);
      const premiumProducts = sortedProducts.slice(-3);
      
      if (timeOfDay < 12) {
        const morningProduct = affordableProducts[0];
        recommendation = `🌅 ${customerName}, sabah için önerilerim:\n\n🍽️ **Kahvaltı Sonrası**: ${morningProduct?.name || 'Margherita Pizza'} (${morningProduct?.price || 45} TL)\n🥤 **Enerji İçin**: Smoothie (12 TL)\n💡 **Kombinasyon**: ${morningProduct?.name || 'Margherita'} + Smoothie = ${(morningProduct?.price || 45) + 12} TL\n\nSabah için ideal seçimler!`;
      } else if (timeOfDay < 18) {
        const lunchProduct = sortedProducts[Math.floor(sortedProducts.length / 2)];
        recommendation = `☀️ ${customerName}, öğle için önerilerim:\n\n🍽️ **Doyurucu**: ${lunchProduct?.name || 'BBQ Burger'} (${lunchProduct?.price || 45} TL)\n🥤 **İçecek**: Kola (8 TL)\n💡 **Kombinasyon**: ${lunchProduct?.name || 'BBQ Burger'} + Kola = ${(lunchProduct?.price || 45) + 8} TL\n\nÖğle yemeği için mükemmel seçenekler!`;
      } else {
        const dinnerProduct = premiumProducts[premiumProducts.length - 1];
        recommendation = `🌙 ${customerName}, akşam için önerilerim:\n\n🍽️ **Premium**: ${dinnerProduct?.name || 'Truffle Pizza'} (${dinnerProduct?.price || 85} TL)\n🥤 **İçecek**: Milkshake (15 TL)\n💡 **Kombinasyon**: ${dinnerProduct?.name || 'Truffle Pizza'} + Milkshake = ${(dinnerProduct?.price || 85) + 15} TL\n\nAkşam yemeği için özel seçenekler!`;
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
      case 'intelligent_category_inquiry':
        return 'bg-purple-100 text-purple-800';
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
              {productsLoading && (
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
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