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

  // Basit state'ler - hook'ları güvenli kullan
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Token kontrolü - basitleştirilmiş
  useEffect(() => {
    console.log('🔍 Mutfak sayfası yükleniyor...');
    console.log('Token:', token ? 'Var' : 'Yok');
    console.log('User:', user ? user.name : 'Yok');
    
    // Auth checking tamamlandı
    setAuthChecking(false);
    
    console.log('✅ Mutfak paneline erişim verildi');
  }, [token, user]);

  // Basit sipariş yükleme fonksiyonu
  const fetchOrders = useCallback(async (branchId: number) => {
    if (!branchId || !token) return;

    setLoading(true);
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
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [token]);

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
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        toast.success(`Sipariş durumu güncellendi`);
      }
    } catch (error: any) {
      console.error('Sipariş durumu güncellenemedi:', error);
      toast.error('Sipariş durumu güncellenemedi');
    }
  }, [token]);

  // Status utility functions
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
          <p>Orders Count: {orders.length}</p>
          <p>Selected Branch: {selectedBranch ? selectedBranch.name : 'Yok'}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">🍳 Mutfak Paneli</h1>
            
            <div className="flex items-center space-x-4">
              <p className="text-gray-600">Basitleştirilmiş Mod</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mutfak Paneli</h2>
          <p className="text-gray-600 mb-4">
            Bu sayfa şu anda basitleştirilmiş modda çalışıyor. Hook'lar güvenli şekilde kullanılıyor.
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
              <p className="text-sm text-green-700">Sipariş Sayısı: {orders.length}</p>
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
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Sayfayı Yenile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 