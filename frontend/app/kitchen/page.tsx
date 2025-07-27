'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, User, Phone, MapPin, CheckCircle, PlayCircle, AlertCircle, Timer } from 'lucide-react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
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
  orderType: string;
  branch: {
    id: number;
    name: string;
    address: string;
  };
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  } | null;
  table: {
    id: number;
    number: string;
    branch: {
      id: number;
      name: string;
    };
  } | null;
  orderItems: OrderItem[];
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const { token, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log('Mutfak sayfası yükleniyor...');
    console.log('Token from store:', token);
    console.log('Window opener:', window.opener);
    
    // Store'dan token'ı almayı dene
    let authToken = token;
    
    // Eğer store'dan token yoksa, localStorage'dan direkt al
    if (!authToken) {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          authToken = parsed.state?.token;
          console.log('Token from auth-storage:', authToken);
        }
      } catch (error) {
        console.error('Auth storage parse error:', error);
      }
    }
    
    console.log('Final authToken:', authToken);
    
    if (!authToken) {
      console.log('Token bulunamadı, pencere kapatılıyor...');
      toast.error('Giriş yapmanız gerekiyor');
      if (window.opener) {
        window.opener.postMessage({ type: 'AUTH_REQUIRED' }, '*');
        window.close();
      } else {
        router.push('/login');
      }
      return;
    }

    console.log('Token bulundu, şubeler yükleniyor...');
    fetchBranches();
  }, [token, router]);

  const fetchBranches = async () => {
    try {
      console.log('fetchBranches çağrıldı');
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error) {
          console.error('Auth storage parse error:', error);
        }
      }
      
      console.log('fetchBranches için token:', authToken);
      console.log('API endpoint:', API_ENDPOINTS.ADMIN_BRANCHES);
      
      const response = await axios.get(API_ENDPOINTS.ADMIN_BRANCHES, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('Şubeler başarıyla yüklendi:', response.data);
      setBranches(response.data);
      if (response.data.length > 0) {
        setSelectedBranch(response.data[0]);
        fetchOrders(response.data[0].id);
      }
    } catch (error) {
      console.error('Şubeler yüklenemedi:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Error details:', (error as any).response?.data);
      }
      toast.error('Şubeler yüklenemedi');
    }
  };

  const fetchOrders = async (branchId: number) => {
    try {
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error) {
          console.error('Auth storage parse error:', error);
        }
      }

      const response = await axios.get(`${API_ENDPOINTS.ADMIN_ORDERS}?branchId=${branchId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Siparişler yüklenemedi:', error);
      toast.error('Siparişler yüklenemedi');
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error) {
          console.error('Auth storage parse error:', error);
        }
      }

      await axios.put(`${API_ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(orderId)}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Sipariş listesini güncelle
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      );

      toast.success(`Sipariş durumu güncellendi: ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Sipariş durumu güncellenemedi:', error);
      toast.error('Sipariş durumu güncellenemedi');
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
      case 'PENDING': return 'Bekliyor';
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

  const getPriorityColor = (createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - orderTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes > 30) return 'border-red-500 bg-red-50';
    if (diffInMinutes > 15) return 'border-orange-500 bg-orange-50';
    return 'border-gray-200 bg-white';
  };

  const filteredOrders = orders.filter(order => {
    if (selectedStatus !== 'all' && order.status !== selectedStatus) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    // Önce duruma göre sırala (Bekliyor > Hazırlanıyor > Hazır)
    const statusOrder = { 'PENDING': 1, 'PREPARING': 2, 'READY': 3, 'DELIVERED': 4, 'CANCELLED': 5 };
    const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 6) - (statusOrder[b.status as keyof typeof statusOrder] || 6);
    
    if (statusDiff !== 0) return statusDiff;
    
    // Aynı durumda olanları zamana göre sırala (en eski önce)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Mutfak ekranı yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  router.push('/admin');
                }
              }}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{window.opener ? 'Kapat' : 'Admin'}</span>
            </Button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">🍳 Mutfak</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs md:text-sm">
              {selectedBranch?.name || 'Şube'}
            </Badge>
            <Badge variant="outline" className="text-xs md:text-sm">
              {filteredOrders.length} Sipariş
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Kontroller */}
        <div className="mb-6 space-y-4">
          {/* Şube Seçimi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Şube</label>
            <select
              value={selectedBranch?.id || ''}
              onChange={(e) => {
                const branch = branches.find(b => b.id === parseInt(e.target.value));
                setSelectedBranch(branch);
                if (branch) {
                  fetchOrders(branch.id);
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-lg text-lg"
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Durum Filtreleri */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Durum Filtresi</label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setSelectedStatus('all')}
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                className="text-sm"
              >
                Tümü ({orders.length})
              </Button>
              <Button
                onClick={() => setSelectedStatus('PENDING')}
                variant={selectedStatus === 'PENDING' ? 'default' : 'outline'}
                size="sm"
                className="text-sm"
              >
                Bekliyor ({orders.filter(o => o.status === 'PENDING').length})
              </Button>
              <Button
                onClick={() => setSelectedStatus('PREPARING')}
                variant={selectedStatus === 'PREPARING' ? 'default' : 'outline'}
                size="sm"
                className="text-sm"
              >
                Hazırlanıyor ({orders.filter(o => o.status === 'PREPARING').length})
              </Button>
              <Button
                onClick={() => setSelectedStatus('READY')}
                variant={selectedStatus === 'READY' ? 'default' : 'outline'}
                size="sm"
                className="text-sm"
              >
                Hazır ({orders.filter(o => o.status === 'READY').length})
              </Button>
            </div>
          </div>
        </div>

        {/* Sipariş Listesi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <Card 
              key={order.id} 
              className={`border-2 transition-all duration-200 hover:shadow-lg ${getPriorityColor(order.createdAt)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{getStatusText(order.status)}</span>
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">#{order.orderNumber}</p>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Timer className="h-3 w-3" />
                      <span>{getTimeElapsed(order.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Müşteri Bilgileri */}
                <div className="space-y-2">
                  {order.customer && (
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{order.customer.name}</span>
                    </div>
                  )}
                  {order.customer && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{order.customer.phone}</span>
                    </div>
                  )}
                  {order.customer && (
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{order.customer.address}</span>
                    </div>
                  )}
                  {order.table && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium">Masa {order.table.number}</span>
                    </div>
                  )}
                </div>

                                 {/* Ürün Listesi */}
                 <div className="space-y-1">
                   <p className="text-sm font-medium text-gray-700">Ürünler:</p>
                   {order.orderItems && order.orderItems.map((item, index) => (
                     <div key={index} className="flex justify-between text-sm">
                       <span>{item.quantity}x {item.product.name}</span>
                       <span className="text-gray-600">₺{item.price.toFixed(2)}</span>
                     </div>
                   ))}
                 </div>

                {/* Notlar */}
                {order.notes && (
                  <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Not:</strong> {order.notes}
                    </p>
                  </div>
                )}

                {/* Toplam */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Toplam:</span>
                  <span className="text-lg font-bold text-green-600">₺{order.totalAmount.toFixed(2)}</span>
                </div>

                {/* Durum Butonları */}
                <div className="flex space-x-2 pt-2">
                  {order.status === 'PENDING' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      Hazırlanmaya Başla
                    </Button>
                  )}
                  {order.status === 'PREPARING' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      Hazır
                    </Button>
                  )}
                  {order.status === 'READY' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm"
                    >
                      Teslim Edildi
                    </Button>
                  )}
                  {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      İptal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🍳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sipariş Yok</h3>
            <p className="text-gray-500">Seçili durumda sipariş bulunmuyor.</p>
          </div>
        )}
      </div>
    </div>
  );
} 