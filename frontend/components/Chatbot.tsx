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

    try {
      // AI destekli yanıt için backend'e gönder
      const response = await axios.post(`${API_BASE_URL}/api/chatbot/ai-message`, {
        customerId: customerId || 1,
        message: message,
        platform: 'web',
        customerInfo: customerInfo,
        conversationHistory: messages.slice(-5) // Son 5 mesajı gönder
      });

      const botResponse: ChatMessage = {
        id: Date.now() + 1,
        message: response.data.response,
        direction: 'incoming',
        createdAt: new Date().toISOString(),
        responseType: response.data.responseType || 'ai_response'
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('AI chat hatası:', error);
      
      // Fallback: Basit yanıt sistemi
      let botResponse: ChatMessage;
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam')) {
        botResponse = {
          id: Date.now() + 1,
          message: 'Merhaba! 👋 Size nasıl yardımcı olabilirim? Sipariş, menü, teslimat veya kampanyalar hakkında sorabilirsiniz.',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'fallback_response'
        };
      } else {
        botResponse = {
          id: Date.now() + 1,
          message: 'Üzgünüm, şu anda AI servisimiz geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
          direction: 'incoming',
          createdAt: new Date().toISOString(),
          responseType: 'error_response'
        };
      }

      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
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