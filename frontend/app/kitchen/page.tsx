'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { API_ENDPOINTS } from '@/lib/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSocket } from '@/lib/socket';
import { useOptimizedInterval, useOptimizedFetch } from '@/hooks/useOptimizedFetch';
import { useOptimizedList } from '@/hooks/useMemoizedState';

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
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { on, off } = useSocket();

  // Optimize edilmiş state'ler
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Optimize edilmiş list state'leri
  const { items: branches, setItems: setBranches } = useOptimizedList<any>();
  const { items: orders, setItems: setOrders, updateItem: updateOrder } = useOptimizedList<Order>();

  // Optimize edilmiş fetch hook'ları
  const { data: branchesData, loading: branchesLoading } = useOptimizedFetch<any[]>(
    API_ENDPOINTS.BRANCHES,
    { 
      cacheTime: 5 * 60 * 1000, // 5 dakika cache
      enabled: false // Geçici olarak devre dışı
    }
  );

  // Branches data'sını set et
  useEffect(() => {
    if (branchesData) {
      setBranches(branchesData);
      // İlk şubeyi otomatik seç
      if (branchesData.length > 0 && !selectedBranch) {
        setSelectedBranch(branchesData[0]);
      }
    }
  }, [branchesData, setBranches, selectedBranch]);

  // Token kontrolü - iyileştirilmiş
  useEffect(() => {
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
    
    // Auth checking tamamlandı
    setAuthChecking(false);
    
    // Geçici olarak authentication kontrolünü devre dışı bırak
    console.log('✅ Mutfak paneline erişim verildi (debug modu)');
    
    /*
    if (!authToken) {
      console.log('❌ Token bulunamadı, login sayfasına yönlendiriliyor');
      toast.error('Giriş yapmanız gerekiyor');
      if (window.opener) {
        window.opener.postMessage({ type: 'AUTH_REQUIRED' }, '*');
        window.close();
      } else {
        router.push('/');
      }
      return;
    }
    
    console.log('✅ Token bulundu, mutfak paneline erişim verildi');
    */
  }, [token, router]);

  // Optimize edilmiş sipariş yükleme fonksiyonu
  const fetchOrders = useCallback(async (branchId: number, showLoading = true) => {
    if (!branchId) return;

    if (showLoading) {
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

      setOrders(activeOrders);
    } catch (error: any) {
      console.error('Siparişler yüklenemedi:', error);
      if (error.response?.status === 401) {
        toast.error('Oturum süresi dolmuş');
        router.push('/');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [token, router, setOrders]);

  // Sipariş durumu güncelleme - optimize edilmiş
  const updateOrderStatus = useCallback(async (orderId: number, newStatus: string) => {
    try {
      const response = await axios.put(
        API_ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(orderId),
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Local state'i güncelle
        updateOrder(orderId, (order) => ({
          ...order,
          status: newStatus
        }));

        toast.success(`Sipariş durumu güncellendi: ${getStatusText(newStatus)}`);
      }
    } catch (error: any) {
      console.error('Sipariş durumu güncellenemedi:', error);
      toast.error('Sipariş durumu güncellenemedi');
    }
  }, [token, updateOrder]);

  // Socket event handlers - optimize edilmiş
  useEffect(() => {
    if (!selectedBranch) return;

    const handleNewOrder = useCallback((data: any) => {
      if (data.branchId === selectedBranch.id) {
        toast.success(`Yeni sipariş: ${data.orderNumber}`);
        fetchOrders(selectedBranch.id, false);
      }
    }, [selectedBranch, fetchOrders]);

    const handleOrderStatusChanged = useCallback((data: any) => {
      if (data.branchId === selectedBranch.id) {
        toast.success(`Sipariş durumu güncellendi: ${data.orderNumber} - ${data.statusText}`);
        fetchOrders(selectedBranch.id, false);
      }
    }, [selectedBranch, fetchOrders]);

    // Event listener'ları ekle
    on('newOrder', handleNewOrder);
    on('orderStatusChanged', handleOrderStatusChanged);

    // Cleanup
    return () => {
      off('newOrder', handleNewOrder);
      off('orderStatusChanged', handleOrderStatusChanged);
    };
  }, [selectedBranch, on, off, fetchOrders]);

  // Optimize edilmiş interval - sadece aktif şube varsa çalış
  useOptimizedInterval(
    () => {
      if (selectedBranch) {
        fetchOrders(selectedBranch.id, false);
      }
    },
    10000, // 10 saniye
    !!selectedBranch // Sadece şube seçiliyse aktif
  );

  // Şube değiştiğinde siparişleri yükle
  useEffect(() => {
    if (selectedBranch) {
      fetchOrders(selectedBranch.id);
    }
  }, [selectedBranch, fetchOrders]);

  // Optimize edilmiş callback'ler
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

  // Filtrelenmiş siparişler - memoize edilmiş
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Sipariş tipi filtresi
    if (selectedOrderType !== 'all') {
      filtered = filtered.filter(order => order.orderType === selectedOrderType);
    }

    // Öncelik sırasına göre sırala (en eski önce)
    return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, selectedOrderType]);

  // Auth checking loading state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yetki kontrolü yapılıyor...</p>
        </div>
      </div>
    );
  }

  if (branchesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug Bilgileri */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">Debug Bilgileri:</h3>
          <p>Token: {token ? 'Var' : 'Yok'}</p>
          <p>User: {user ? user.name : 'Yok'}</p>
          <p>User Role: {user ? user.role : 'Yok'}</p>
          <p>Auth Checking: {authChecking ? 'Evet' : 'Hayır'}</p>
          <p>Branches Loading: {branchesLoading ? 'Evet' : 'Hayır'}</p>
          <p>Selected Branch: {selectedBranch ? selectedBranch.name : 'Yok'}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🍳 Mutfak Paneli</h1>
            
            <div className="flex items-center space-x-4">
              <p className="text-gray-600">Debug Modu - API çağrıları devre dışı</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mutfak Paneli</h2>
          <p className="text-gray-600 mb-4">
            Bu sayfa şu anda debug modunda çalışıyor. API çağrıları geçici olarak devre dışı bırakıldı.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">Authentication Durumu</h3>
              <p className="text-sm text-blue-700">Token: {token ? 'Mevcut' : 'Yok'}</p>
              <p className="text-sm text-blue-700">Kullanıcı: {user ? user.name : 'Giriş yapılmamış'}</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900">Sayfa Durumu</h3>
              <p className="text-sm text-green-700">Auth Checking: {authChecking ? 'Devam ediyor' : 'Tamamlandı'}</p>
              <p className="text-sm text-green-700">Branches Loading: {branchesLoading ? 'Devam ediyor' : 'Tamamlandı'}</p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-900">Test Butonları</h3>
              <div className="space-x-2">
                <button 
                  onClick={() => console.log('Token:', token)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Token'ı Konsola Yazdır
                </button>
                <button 
                  onClick={() => console.log('User:', user)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  User'ı Konsola Yazdır
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Ana Sayfaya Dön
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 