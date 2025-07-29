'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  PlayCircle, 
  AlertCircle, 
  Timer,
  RefreshCw,
  Bell,
  BellOff
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  note?: string;
  product: {
    id: number;
    name: string;
    description: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  orderType: string;
  table: {
    id: number;
    number: string;
    branch: {
      id: number;
      name: string;
    };
  };
  orderItems: OrderItem[];
}

interface OrderTrackingProps {
  tableId?: string;
  orderId?: string;
}

export default function OrderTracking({ tableId, orderId }: OrderTrackingProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // URL parametrelerini al
  const searchParams = useSearchParams();
  const urlTableId = searchParams.get('table');
  const urlOrderId = searchParams.get('order');
  
  const finalTableId = tableId || urlTableId;
  const finalOrderId = orderId || urlOrderId;

  useEffect(() => {
    if (finalTableId) {
      loadTableOrders(parseInt(finalTableId));
    } else if (finalOrderId) {
      loadOrder(parseInt(finalOrderId));
    } else {
      setLoading(false);
      toast.error('Masa veya sipariş bilgisi bulunamadı');
    }
  }, [finalTableId, finalOrderId]);

  // Otomatik yenileme
  useEffect(() => {
    if (!finalTableId && !finalOrderId) return;

    const interval = setInterval(() => {
      console.log('🔄 Sipariş durumu yenileniyor...');
      if (finalTableId) {
        loadTableOrders(parseInt(finalTableId), false);
      } else if (finalOrderId) {
        loadOrder(parseInt(finalOrderId), false);
      }
    }, 5000); // 5 saniyede bir yenile

    return () => clearInterval(interval);
  }, [finalTableId, finalOrderId]);

  const loadTableOrders = async (tableId: number, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('🔍 Masa siparişleri yükleniyor, tableId:', tableId);
      console.log('🔗 API URL:', API_ENDPOINTS.TABLE_ORDERS(tableId));
      
      const response = await apiRequest(API_ENDPOINTS.TABLE_ORDERS(tableId));
      
      console.log('✅ Masa siparişleri yüklendi:', response);
      console.log('📊 Sipariş sayısı:', response.orders?.length || 0);
      
      if (response.orders && response.orders.length > 0) {
        console.log('📋 İlk sipariş:', response.orders[0]);
      }
      
      setOrders(response.orders || []);
      setLastUpdate(new Date());
      
      // Eğer hiç sipariş yoksa (hepsi teslim edilmişse) sayfayı kapat
      if (!response.orders || response.orders.length === 0) {
        console.log('✅ Tüm siparişler teslim edildi, sayfa kapatılıyor...');
        toast.success('Tüm siparişleriniz teslim edildi! Yeni sipariş vermek için QR kodu tekrar okutun.');
        
        // 3 saniye sonra sayfayı kapat
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.close();
            // Eğer window.close() çalışmazsa, ana sayfaya yönlendir
            window.location.href = '/table-order';
          }
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ Masa siparişleri yüklenemedi:', error);
      console.error('🔍 Hata detayları:', {
        message: error?.message,
        status: error?.status,
        response: error?.response
      });
      if (showLoading) {
        toast.error('Siparişler yüklenemedi');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadOrder = async (orderId: number, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('🔍 Sipariş yükleniyor, orderId:', orderId);
      const response = await apiRequest(API_ENDPOINTS.ORDER_DETAIL(orderId));
      
      console.log('✅ Sipariş yüklendi:', response);
      setOrders([response]);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('❌ Sipariş yüklenemedi:', error);
      if (showLoading) {
        toast.error('Sipariş yüklenemedi');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PREPARING': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'READY': return 'bg-green-100 text-green-800 border-green-200';
      case 'DELIVERED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Sipariş Alındı';
      case 'PREPARING': return 'Hazırlanıyor';
      case 'READY': return 'Hazır';
      case 'DELIVERED': return 'Teslim Edildi';
      case 'CANCELLED': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <AlertCircle className="h-4 w-4" />;
      case 'PREPARING': return <PlayCircle className="h-4 w-4" />;
      case 'READY': return <CheckCircle className="h-4 w-4" />;
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours} saat ${minutes} dakika`;
    }
  };

  const getEstimatedTime = (status: string, createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    switch (status) {
      case 'PENDING':
        return Math.max(0, 15 - diffInMinutes);
      case 'PREPARING':
        return Math.max(0, 25 - diffInMinutes);
      case 'READY':
        return 0;
      default:
        return 0;
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'PENDING': return 25;
      case 'PREPARING': return 75;
      case 'READY': return 100;
      case 'DELIVERED': return 100;
      case 'CANCELLED': return 0;
      default: return 0;
    }
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    toast.success(notificationsEnabled ? 'Bildirimler kapatıldı' : 'Bildirimler açıldı');
  };

  const refreshOrders = () => {
    if (finalTableId) {
      loadTableOrders(parseInt(finalTableId));
    } else if (finalOrderId) {
      loadOrder(parseInt(finalOrderId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Sipariş durumu yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🍽️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sipariş Bulunamadı</h2>
          <p className="text-gray-600 mb-6">
            Bu masa için aktif sipariş bulunmuyor veya sipariş tamamlanmış.
          </p>
          <Button onClick={refreshOrders} className="bg-orange-600 hover:bg-orange-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">📱 Sipariş Takibi</h1>
              {orders[0]?.table && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  🍽️ Masa {orders[0].table.number}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={toggleNotifications}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {notificationsEnabled ? 'Bildirimler Açık' : 'Bildirimler Kapalı'}
                </span>
              </Button>
              <Button
                onClick={refreshOrders}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Yenile</span>
              </Button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
          </div>
        </div>
      </div>

      {/* Sipariş Listesi */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {orders.map((order) => (
          <Card key={order.id} className="shadow-lg border-2 border-orange-100">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Sipariş #{order.orderNumber}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1">{getStatusText(order.status)}</span>
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sipariş Durumu</span>
                  <span>{getProgressPercentage(order.status)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getProgressPercentage(order.status)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Alındı</span>
                  <span>Hazırlanıyor</span>
                  <span>Hazır</span>
                  <span>Teslim</span>
                </div>
              </div>

              {/* Tahmini Süre */}
              {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Tahmini Kalan Süre: {getEstimatedTime(order.status, order.createdAt)} dakika
                    </span>
                  </div>
                </div>
              )}

              {/* Ürün Listesi */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Sipariş Edilen Ürünler:</h4>
                <div className="space-y-1">
                  {order.orderItems.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <div className="flex-1">
                        <span className="font-medium">{item.quantity}x {item.product.name}</span>
                        {item.note && (
                          <p className="text-xs text-gray-600 mt-1">Not: {item.note}</p>
                        )}
                      </div>
                      <span className="text-gray-600">₺{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notlar */}
              {order.notes && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Özel Not:</strong> {order.notes}
                  </p>
                </div>
              )}

              {/* Toplam */}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-medium text-gray-900">Toplam Tutar:</span>
                <span className="text-xl font-bold text-green-600">₺{order.totalAmount.toFixed(2)}</span>
              </div>

              {/* Durum Mesajları */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Sipariş süresi: {getTimeElapsed(order.createdAt)}
                  </span>
                </div>
                {order.status === 'PENDING' && (
                  <p className="text-sm text-blue-600 mt-1">
                    Siparişiniz alındı ve mutfağa iletildi. Hazırlanmaya başlanacak.
                  </p>
                )}
                {order.status === 'PREPARING' && (
                  <p className="text-sm text-blue-600 mt-1">
                    Siparişiniz hazırlanıyor. Kısa süre içinde hazır olacak.
                  </p>
                )}
                {order.status === 'READY' && (
                  <p className="text-sm text-green-600 mt-1">
                    Siparişiniz hazır! Servis ediliyor.
                  </p>
                )}
                {order.status === 'DELIVERED' && (
                  <p className="text-sm text-green-600 mt-1">
                    Siparişiniz teslim edildi. Afiyet olsun!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 