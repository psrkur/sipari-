'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { API_ENDPOINTS } from '@/lib/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSocket } from '@/lib/socket';

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
  // Tüm hook'ları en üstte çağır - hiçbir koşul olmadan
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { on, off } = useSocket();
  
  // State'leri tanımla
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Ref'leri tanımla
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Şubeleri yükle fonksiyonu
  const fetchBranches = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(API_ENDPOINTS.BRANCHES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const branchesData = Array.isArray(response.data) ? response.data : [];
      setBranches(branchesData);
      
      // İlk şubeyi otomatik seç
      if (branchesData.length > 0 && !selectedBranch) {
        setSelectedBranch(branchesData[0]);
      }
    } catch (error: any) {
      console.error('Şubeler yüklenemedi:', error);
      toast.error('Şubeler yüklenemedi');
    }
  }, [token, selectedBranch]);

  // Siparişleri yükle fonksiyonu
  const fetchOrders = useCallback(async (branchId: number, silent = false) => {
    if (!branchId || !token) return;

    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_ORDERS, {
        headers: { Authorization: `Bearer ${token}` },
        params: { branchId }
      });

      const ordersData = Array.isArray(response.data) ? response.data : [];
      
      // Sadece aktif siparişleri filtrele
      const activeOrders = ordersData.filter((order: Order) => 
        ['PENDING', 'PREPARING', 'READY'].includes(order.status)
      );

      // Sadece veri değişikliği varsa güncelle
      const hasChanges = JSON.stringify(activeOrders) !== JSON.stringify(orders);
      
      if (hasChanges) {
        setOrders(activeOrders);
        setLastUpdate(new Date());
        console.log(`🔄 Siparişler güncellendi: ${activeOrders.length} sipariş`);
      } else {
        console.log('📊 Veri değişikliği yok, güncelleme atlandı');
      }
    } catch (error: any) {
      console.error('Siparişler yüklenemedi:', error);
      if (!silent) {
        toast.error('Siparişler yüklenemedi');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [token, orders]);

  // Sipariş durumu güncelleme
  const updateOrderStatus = useCallback(async (orderId: number, newStatus: string) => {
    if (!token) return;
    
    try {
      const response = await axios.put(
        API_ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(orderId),
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        if (selectedBranch) {
          fetchOrders(selectedBranch.id, true);
        }
        toast.success(`Sipariş durumu güncellendi`);
      }
    } catch (error: any) {
      console.error('Sipariş durumu güncellenemedi:', error);
      toast.error('Sipariş durumu güncellenemedi');
    }
  }, [token, selectedBranch, fetchOrders]);

  // Utility fonksiyonları
  const getStatusColor = useCallback((status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PREPARING: 'bg-blue-100 text-blue-800 border-blue-200',
      READY: 'bg-green-100 text-green-800 border-green-200',
      DELIVERED: 'bg-gray-100 text-gray-800 border-gray-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  const getStatusText = useCallback((status: string) => {
    const texts: { [key: string]: string } = {
      PENDING: 'Bekliyor',
      PREPARING: 'Hazırlanıyor',
      READY: 'Hazır',
      DELIVERED: 'Teslim Edildi',
      CANCELLED: 'İptal Edildi'
    };
    return texts[status] || status;
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    const icons: { [key: string]: string } = {
      PENDING: '⏳',
      PREPARING: '👨‍🍳',
      READY: '✅',
      DELIVERED: '🚚',
      CANCELLED: '❌'
    };
    return icons[status] || '📋';
  }, []);

  const getTimeElapsed = useCallback((createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}s ${diffMins % 60}dk`;
    }
    return `${diffMins}dk`;
  }, []);

  const getPriorityColor = useCallback((createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins > 30) return 'border-red-500 bg-red-50';
    if (diffMins > 15) return 'border-orange-500 bg-orange-50';
    return 'border-green-500 bg-green-50';
  }, []);

  // Filtrelenmiş siparişler
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return [];
    }

    let filtered = orders;

    if (selectedOrderType !== 'all') {
      filtered = filtered.filter(order => order.orderType === selectedOrderType);
    }

    return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, selectedOrderType]);

  // Effect'ler - hiçbir koşul olmadan
  useEffect(() => {
    document.title = 'Mutfak - Yemek5';
  }, []);

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: 'KITCHEN_OPENED' }, '*');
    }
  }, []);

  useEffect(() => {
    console.log('🔍 Mutfak sayfası yükleniyor...');
    console.log('Token:', token ? 'Var' : 'Yok');
    console.log('User:', user ? user.name : 'Yok');
    
    setAuthChecking(false);
    
    if (token) {
      fetchBranches();
    }
    
    console.log('✅ Mutfak paneline erişim verildi');
  }, [token, user, fetchBranches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchOrders(selectedBranch.id, false);
    }
  }, [selectedBranch, fetchOrders]);

  useEffect(() => {
    if (!autoRefresh || !selectedBranch) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (selectedBranch && token) {
        console.log('⏰ Sessiz arka plan veri kontrolü...');
        fetchOrders(selectedBranch.id, true);
      }
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, selectedBranch, token, fetchOrders]);

  useEffect(() => {
    if (!token || !selectedBranch) return;

    const handleNewOrder = (data: any) => {
      console.log('📦 Yeni sipariş geldi:', data);
      if (data.branchId === selectedBranch.id) {
        toast.success('Yeni sipariş geldi!');
        fetchOrders(selectedBranch.id, true);
      }
    };

    const handleOrderStatusChanged = (data: any) => {
      console.log('🔄 Sipariş durumu güncellendi:', data);
      if (data.branchId === selectedBranch.id) {
        fetchOrders(selectedBranch.id, true);
      }
    };

    on('newOrder', handleNewOrder);
    on('orderStatusChanged', handleOrderStatusChanged);

    return () => {
      off('newOrder', handleNewOrder);
      off('orderStatusChanged', handleOrderStatusChanged);
    };
  }, [token, selectedBranch, on, off, fetchOrders]);

  // Ana render - hiçbir koşullu return yok
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Auth Checking Loading State */}
      {authChecking && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yetki kontrolü yapılıyor...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!authChecking && (
        <>
          {/* Debug Bilgileri */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              <h3 className="font-bold">Debug Bilgileri:</h3>
              <p>Token: {token ? 'Var' : 'Yok'}</p>
              <p>User: {user ? user.name : 'Yok'}</p>
              <p>User Role: {user ? user.role : 'Yok'}</p>
              <p>Auth Checking: {authChecking ? 'Evet' : 'Hayır'}</p>
              <p>Orders Count: {orders.length}</p>
              <p>Selected Branch: {selectedBranch ? selectedBranch.name : 'Yok'}</p>
              <p>Tamamen Sessiz Kontrol: {autoRefresh ? 'Açık' : 'Kapalı'}</p>
              <p>Last Update: {lastUpdate.toLocaleTimeString('tr-TR')}</p>
            </div>
          )}

          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <h1 className="text-2xl font-bold text-gray-900">🍳 Mutfak Paneli</h1>
                
                <div className="flex items-center space-x-4">
                  {/* Otomatik Yenileme Kontrolü */}
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Tamamen Sessiz Kontrol</span>
                    </label>
                    {autoRefresh && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        Sessiz 5s
                      </span>
                    )}
                  </div>

                  {/* Son Güncelleme Zamanı */}
                  <div className="text-xs text-gray-500">
                    Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
                  </div>

                  {/* Manuel Yenileme Butonu */}
                  <button
                    onClick={() => selectedBranch && fetchOrders(selectedBranch.id, false)}
                    disabled={loading}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '🔄' : '🔄 Manuel Güncelle'}
                  </button>

                  {/* Şube Seçimi */}
                  {branches.length > 0 && (
                    <select
                      value={selectedBranch?.id || ''}
                      onChange={(e) => {
                        const branch = branches.find(b => b.id === parseInt(e.target.value));
                        setSelectedBranch(branch);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Sipariş Tipi Filtresi */}
                  <select
                    value={selectedOrderType}
                    onChange={(e) => setSelectedOrderType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tüm Siparişler</option>
                    <option value="DELIVERY">Teslimat</option>
                    <option value="PICKUP">Paket Servis</option>
                    <option value="DINE_IN">Garson Siparişi</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Sipariş Listesi */}
            {selectedBranch ? (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Siparişler yükleniyor...</p>
                  </div>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <div key={order.id} className={`bg-white rounded-lg shadow-sm border p-6 ${getPriorityColor(order.createdAt)}`}>
                      {/* Sipariş Başlığı */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Sipariş #{order.orderNumber}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)} {getStatusText(order.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getTimeElapsed(order.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Müşteri Bilgisi */}
                      {order.customer && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium text-gray-900">{order.customer.name}</p>
                          <p className="text-sm text-gray-600">{order.customer.phone}</p>
                          {order.orderType === 'DELIVERY' && (
                            <p className="text-sm text-gray-600">{order.customer.address}</p>
                          )}
                        </div>
                      )}

                      {/* Masa Bilgisi */}
                      {order.table && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <p className="font-medium text-blue-900">Masa {order.table.number}</p>
                          <p className="text-sm text-blue-600">{order.table.branch.name}</p>
                        </div>
                      )}

                      {/* Sipariş Detayları */}
                      <div className="mb-4">
                        {order.orderItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {item.quantity}x
                              </span>
                              <span className="text-sm text-gray-700">{item.product.name}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              ₺{item.price}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Toplam */}
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-bold text-gray-900">Toplam:</span>
                        <span className="text-lg font-bold text-gray-900">₺{order.totalAmount}</span>
                      </div>

                      {/* Notlar */}
                      {order.notes && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Not:</strong> {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Durum Güncelleme Butonları */}
                      <div className="flex space-x-2">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                          >
                            Hazırlamaya Başla
                          </button>
                        )}
                        
                        {order.status === 'PREPARING' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'READY')}
                            className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                          >
                            Hazır
                          </button>
                        )}
                        
                        {order.status === 'READY' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                            className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                          >
                            Teslim Edildi
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>Seçili şubede aktif sipariş bulunamadı</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Lütfen bir şube seçin</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 