'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Clock, User, Phone } from 'lucide-react';
import axios from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useSocketStore } from '@/lib/socket';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: number;
  message: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  responseType?: string;
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
}

interface ChatStats {
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  date: string;
}

export default function ChatManagement() {
  // Tüm hook'ları en üstte çağır - hiçbir koşul olmadan
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const { token } = useAuthStore();
  const { on, off } = useSocketStore();
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    fetchStats();
    fetchCustomers();
  }, []);

  // Gerçek zamanlı chat mesajları
  useEffect(() => {
    const handleNewChatMessage = (data: any) => {
      toast.success(`Yeni chat mesajı: ${data.customerName}`);
      fetchStats(); // İstatistikleri güncelle
    };

    on('newChatMessage', handleNewChatMessage);

    return () => {
      off('newChatMessage', handleNewChatMessage);
    };
  }, [on, off]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chatbot/chat/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Chat istatistikleri getirilemedi:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CUSTOMERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Müşteriler getirilemedi:', error);
      setLoading(false);
    }
  };

  const fetchCustomerMessages = async (customerId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chatbot/chat/messages/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      setSelectedCustomer(customerId);
    } catch (error) {
      console.error('Chat mesajları getirilemedi:', error);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedCustomer) return;

    try {
      await axios.post(`${API_BASE_URL}/api/chatbot/chat/message`, {
        customerId: selectedCustomer,
        message: replyMessage,
        platform: 'admin',
        direction: 'outgoing'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReplyMessage('');
      fetchCustomerMessages(selectedCustomer);
      toast.success('Yanıt gönderildi');
    } catch (error) {
      console.error('Yanıt gönderilemedi:', error);
      toast.error('Yanıt gönderilemedi');
    }
  };

  const getResponseTypeColor = (type?: string) => {
    switch (type) {
      case 'order_status_inquiry':
        return 'bg-blue-100 text-blue-800';
      case 'menu_inquiry':
        return 'bg-green-100 text-green-800';
      case 'delivery_time_inquiry':
        return 'bg-yellow-100 text-yellow-800';
      case 'complaint':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* İstatistikler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Chat İstatistikleri</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalMessages}</div>
                <div className="text-sm text-blue-600">Toplam Mesaj</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.incomingMessages}</div>
                <div className="text-sm text-green-600">Gelen Mesaj</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.outgoingMessages}</div>
                <div className="text-sm text-orange-600">Giden Mesaj</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Müşteri Listesi */}
        <Card>
          <CardHeader>
            <CardTitle>Müşteriler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => fetchCustomerMessages(customer.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCustomer === customer.id
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500 flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Mesajları */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chat Mesajları</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <div className="space-y-4">
                {/* Mesaj Listesi */}
                <div className="h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg ${
                          message.direction === 'outgoing'
                            ? 'bg-orange-600 text-white'
                            : 'bg-white text-gray-800 border'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        {message.responseType && (
                          <Badge className={`mt-1 text-xs ${getResponseTypeColor(message.responseType)}`}>
                            {message.responseType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        <div className="text-xs opacity-70 mt-1">
                          {formatDate(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Yanıt Gönderme */}
                <div className="flex space-x-2">
                  <Input
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Yanıtınızı yazın..."
                    onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                  />
                  <Button onClick={sendReply} disabled={!replyMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Chat mesajlarını görmek için bir müşteri seçin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 