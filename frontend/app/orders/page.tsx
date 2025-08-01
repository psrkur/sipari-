'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Package, Truck, Home } from 'lucide-react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  note?: string;
  product: {
    id: number;
    name: string;
    description?: string;
    image?: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  totalAmount: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: number;
    name: string;
    address: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
  orderItems: OrderItem[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PREPARING':
      return 'bg-blue-100 text-blue-800';
    case 'READY':
      return 'bg-green-100 text-green-800';
    case 'DELIVERED':
      return 'bg-gray-100 text-gray-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'Bekliyor';
    case 'PREPARING':
      return 'Hazırlanıyor';
    case 'READY':
      return 'Hazır';
    case 'DELIVERED':
      return 'Teslim Edildi';
    case 'CANCELLED':
      return 'İptal Edildi';
    default:
      return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-4 w-4" />;
    case 'PREPARING':
      return <Package className="h-4 w-4" />;
    case 'READY':
      return <Truck className="h-4 w-4" />;
    case 'DELIVERED':
      return <CheckCircle className="h-4 w-4" />;
    case 'CANCELLED':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [previousOrders, setPreviousOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { token, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      toast.error('Siparişlerinizi görmek için giriş yapın');
      router.push('/');
      return;
    }

    fetchOrders();
    
    // Her 30 saniyede bir sipariş durumlarını kontrol et
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]); // Sadece token'ı dependency olarak kullan

  const fetchOrders = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.CUSTOMER_ORDERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newOrders = response.data;
      
      // Sipariş durumu değişikliklerini kontrol et
      if (previousOrders.length > 0) {
        newOrders.forEach((newOrder: Order) => {
          const oldOrder = previousOrders.find(o => o.id === newOrder.id);
          if (oldOrder && oldOrder.status !== newOrder.status) {
            // Durum değişikliği bildirimi
            const statusMessages = {
              'PENDING': 'Siparişiniz alındı ve hazırlanmaya başlandı.',
              'PREPARING': 'Siparişiniz hazırlanıyor.',
              'READY': 'Siparişiniz hazır! Teslimata çıkıyoruz.',
              'DELIVERED': 'Siparişiniz teslim edildi. Afiyet olsun!',
              'CANCELLED': 'Siparişiniz iptal edildi.'
            };
            
            const message = statusMessages[newOrder.status as keyof typeof statusMessages] || 'Sipariş durumunuz güncellendi.';
            toast.success(`Sipariş #${newOrder.orderNumber}: ${message}`, {
              duration: 5000,
              icon: '🍕'
            });
          }
        });
      }
      
      setPreviousOrders(orders);
      setOrders(newOrders);
    } catch (error: any) {
      console.error('Siparişler getirilemedi:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        router.push('/');
        return;
      }
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const printOrder = () => {
    if (!selectedOrder) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sipariş Detayı - ${selectedOrder.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .order-info { margin-bottom: 20px; }
          .order-info table { width: 100%; border-collapse: collapse; }
          .order-info td { padding: 5px; border: 1px solid #ddd; }
          .order-info td:first-child { font-weight: bold; background-color: #f5f5f5; }
          .notes-info { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
          .items { margin-bottom: 20px; }
          .item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; text-align: right; border-top: 2px solid #333; padding-top: 10px; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍕 Sipariş Detayı</h1>
          <h2>Sipariş No: ${selectedOrder.orderNumber}</h2>
        </div>
        
        <div class="order-info">
          <table>
            <tr><td>Şube</td><td>${selectedOrder.branch.name}</td></tr>
            <tr><td>Durum</td><td>${getStatusText(selectedOrder.status)}</td></tr>
            <tr><td>Tarih</td><td>${formatDate(selectedOrder.createdAt)}</td></tr>
            <tr><td>Toplam Tutar</td><td>₺${selectedOrder.totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>
        
        ${selectedOrder.notes ? 
          `<div class="notes-info">
            <strong>Sipariş Notu:</strong> ${selectedOrder.notes}
          </div>` : ''
        }
        
        <div class="items">
          <h3>Sipariş Öğeleri:</h3>
          ${selectedOrder.orderItems.map((item, index) => `
            <div class="item">
              <div>
                <strong>${item.product.name}</strong><br>
                <small>${item.quantity} adet × ₺${item.price.toFixed(2)}</small>
                ${item.note ? `<br><small style="color: #0066cc;">Not: ${item.note}</small>` : ''}
              </div>
              <div>
                <strong>₺${(item.quantity * item.price).toFixed(2)}</strong>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="total">
          <strong>Toplam: ₺${selectedOrder.totalAmount.toFixed(2)}</strong>
        </div>
        
        <div class="footer">
          <p>Bu belge ${new Date().toLocaleString('tr-TR')} tarihinde yazdırılmıştır.</p>
          <p>Teşekkür ederiz! 🍕</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Yazdırma işlemini başlat
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Siparişleriniz yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {user?.role === 'CUSTOMER' ? 'Siparişlerim' : 'Müşteri Siparişleri'}
            </h1>
            <p className="text-gray-600">
              {user?.role === 'CUSTOMER' 
                ? 'Tüm siparişlerinizi buradan takip edebilirsiniz'
                : 'Tüm müşteri siparişlerini buradan görüntüleyebilirsiniz'
              }
            </p>
          </div>

          {orders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {user?.role === 'CUSTOMER' ? 'Henüz siparişiniz yok' : 'Henüz müşteri siparişi yok'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {user?.role === 'CUSTOMER' 
                    ? 'İlk siparişinizi vermek için ana sayfaya dönün'
                    : 'Henüz hiç müşteri siparişi bulunmuyor'
                  }
                </p>
                {user?.role === 'CUSTOMER' && (
                  <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700">
                    Sipariş Ver
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          Sipariş #{order.orderNumber}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                        {getStatusIcon(order.status)}
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-gray-500" />
                        <div>
                          <p className="font-medium">{order.branch.name}</p>
                          <p className="text-sm text-gray-600">{order.branch.address}</p>
                          {user?.role !== 'CUSTOMER' && order.user && (
                            <p className="text-xs text-blue-600 mt-1">
                              Müşteri: {order.user.name} ({order.user.email})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          ₺{order.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">Toplam Tutar</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {order.orderItems.length} ürün
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.orderItems.reduce((sum, item) => sum + item.quantity, 0)} adet
                        </p>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-700">
                          <strong>Not:</strong> {order.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        onClick={() => openOrderDetails(order)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Detayları Gör
                      </Button>
                      
                      {order.status === 'PENDING' && (
                        <p className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                          Siparişiniz alındı, hazırlanmaya başlandı
                        </p>
                      )}
                      
                      {order.status === 'PREPARING' && (
                        <p className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          Siparişiniz hazırlanıyor
                        </p>
                      )}
                      
                      {order.status === 'READY' && (
                        <p className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                          Siparişiniz hazır! Teslimata çıkıyoruz
                        </p>
                      )}
                      
                      {order.status === 'DELIVERED' && (
                        <p className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                          Siparişiniz teslim edildi
                        </p>
                      )}
                      
                      {order.status === 'CANCELLED' && (
                        <p className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                          Siparişiniz iptal edildi
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sipariş Detay Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Sipariş Detayları</h3>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={printOrder}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                    title="Siparişi Yazdır"
                  >
                    🖨️ Yazdır
                  </Button>
                  <Button
                    variant="outline"
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Sipariş No:</strong> {selectedOrder.orderNumber}
                  </div>
                  <div>
                    <strong>Durum:</strong> 
                    <Badge className={`ml-2 ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusText(selectedOrder.status)}
                    </Badge>
                  </div>
                  <div>
                    <strong>Şube:</strong> {selectedOrder.branch.name}
                  </div>
                  <div>
                    <strong>Tutar:</strong> ₺{selectedOrder.totalAmount.toFixed(2)}
                  </div>
                  <div>
                    <strong>Tarih:</strong> {formatDate(selectedOrder.createdAt)}
                  </div>
                  <div>
                    <strong>Güncelleme:</strong> {formatDate(selectedOrder.updatedAt)}
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <strong>Not:</strong>
                    <p className="mt-1 text-gray-700">{selectedOrder.notes}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-3">Sipariş Öğeleri</h4>
                  <div className="space-y-3">
                    {selectedOrder.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          {item.note && (
                            <p className="text-sm text-gray-600">Not: {item.note}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.quantity} adet</p>
                          <p className="text-sm text-gray-600">₺{item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 