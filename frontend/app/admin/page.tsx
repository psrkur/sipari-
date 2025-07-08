"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

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
  items: OrderItem[];
  orderItems?: OrderItem[];
}

interface Category {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [branches, setBranches] = useState<{id:number, name:string}[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER', branchId: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', categoryId: '', branchId: '' });
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', price: '', categoryId: '', branchId: '', isActive: true });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', description: '', isActive: true });
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'products' | 'categories' | 'daily-stats'>('orders');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  // Günlük İstatistikler için state
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [dailyStatsLoading, setDailyStatsLoading] = useState(false);
  const [dailyStatsBranchId, setDailyStatsBranchId] = useState('');

  useEffect(() => {
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_MANAGER')) {
      router.push('/login');
      return;
    }
    fetchOrders();
  }, [user, router]);

  useEffect(() => {
    // Şubeleri çek
    axios.get('http://localhost:3001/api/branches', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setBranches(res.data))
      .catch(() => setBranches([]));
    
    // Kategorileri çek
    axios.get('http://localhost:3001/api/categories', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCategories(res.data))
      .catch(() => setCategories([]));
    
    // Süper admin ise kullanıcıları ve ürünleri de çek
    if (user && user.role === 'SUPER_ADMIN') {
      axios.get('http://localhost:3001/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUsers(res.data))
        .catch(() => setUsers([]));
      
      axios.get('http://localhost:3001/api/admin/products', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setProducts(res.data))
        .catch(() => setProducts([]));
    }
  }, [token, user]);

  // Kullanıcıları süper admin en üstte olacak şekilde sırala
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === 'SUPER_ADMIN') return -1;
    if (b.role === 'SUPER_ADMIN') return 1;
    return 0;
  });

  // 10 saniyede bir otomatik yenileme
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, [user, token]);

  // Ses uyarısı için Web Audio API kullanımı
  const playNotificationSound = () => {
    if (typeof window !== 'undefined') {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.log('Ses çalınamadı:', error);
      }
    }
  };

  // Yeni sipariş geldiğinde uyarı
  useEffect(() => {
    if (orders.length > lastOrderCount && lastOrderCount > 0) {
      playNotificationSound();
      toast.success('Yeni sipariş geldi! 🎉');
    }
    setLastOrderCount(orders.length);
  }, [orders.length, lastOrderCount]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/admin/orders', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setOrders(response.data);
    } catch (error) {
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      console.log('Sipariş durumu güncelleniyor:', orderId, status);
      const response = await axios.put(`http://localhost:3001/api/admin/orders/${orderId}/status`, 
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      console.log('Sipariş durumu güncellendi:', response.data);
      toast.success('Sipariş durumu güncellendi');
      fetchOrders(); // Listeyi yenile
    } catch (error: any) {
      console.error('Sipariş durumu güncelleme hatası:', error);
      toast.error(`Sipariş durumu güncellenemedi: ${error.response?.data?.error || error.message}`);
    }
  };

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

  const deleteUser = async (userId: number) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`http://localhost:3001/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı silindi');
      // Kullanıcı listesini yenile
      const response = await axios.get('http://localhost:3001/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Kullanıcı silinemedi');
    }
  };

  const editProduct = (product: any) => {
    setEditingProduct(product);
    setEditProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      categoryId: product.categoryId.toString(),
      branchId: product.branchId.toString(),
      isActive: product.isActive
    });
    setShowEditProductModal(true);
  };

  const updateProduct = async () => {
    try {
      const response = await axios.put(`http://localhost:3001/api/admin/products/${editingProduct.id}`, {
        name: editProductForm.name,
        description: editProductForm.description,
        price: Number(editProductForm.price),
        categoryId: editProductForm.categoryId === 'all' ? 'all' : Number(editProductForm.categoryId),
        branchId: editProductForm.branchId === 'all' ? 'all' : Number(editProductForm.branchId),
        isActive: editProductForm.isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Ürün başarıyla güncellendi');
      setShowEditProductModal(false);
      setEditingProduct(null);
      
      // Ürün listesini yenile
      const productsResponse = await axios.get('http://localhost:3001/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(productsResponse.data);
    } catch (error: any) {
      toast.error(`Ürün güncellenemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  const deleteProduct = async (productId: number) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`http://localhost:3001/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün silindi');
      
      // Ürün listesini yenile
      const response = await axios.get('http://localhost:3001/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      toast.error('Ürün silinemedi');
    }
  };

  // Kategori silme fonksiyonu
  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(`http://localhost:3001/api/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kategori başarıyla silindi');
      // Kategori listesini yenile
      const response = await axios.get('http://localhost:3001/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error: any) {
      toast.error(`Kategori silinemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  // Tarih formatla
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  // analytics ile ilgili tüm yorum satırlarını ve JSX açıklamalarını tamamen kaldırıyorum
  // 1. analytics ile ilgili state'ler ve fonksiyonlar
  // const [analytics, setAnalytics] = useState<any[]>([]);
  // const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // const [analyticsBranchId, setAnalyticsBranchId] = useState('');
  // const [analyticsPeriod, setAnalyticsPeriod] = useState<'realtime' | 'monthly'>('realtime');
  // const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  // const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  // const fetchAnalytics = async () => { ... }
  // useEffect(() => { ... }, [activeTab, analyticsBranchId, analyticsPeriod, analyticsStartDate, analyticsEndDate]);

  // Günlük İstatistikler verisini çek
  const fetchDailyStats = async () => {
    setDailyStatsLoading(true);
    try {
      const params: any = {};
      if (dailyStatsBranchId) params.branchId = dailyStatsBranchId;
      const res = await axios.get('http://localhost:3001/api/admin/daily-stats', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setDailyStats(res.data);
    } catch {
      setDailyStats([]);
    } finally {
      setDailyStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily-stats') {
      fetchDailyStats();
    }
    // eslint-disable-next-line
  }, [activeTab, dailyStatsBranchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Siparişler yükleniyor...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Paneli</h1>
              <p className="mt-2 text-gray-600">Gelen siparişleri takip edin ve yönetin</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Otomatik yenileme aktif (10s)</span>
            </div>
          </div>
          {user && user.role === 'SUPER_ADMIN' && (
            <div className="flex space-x-4 mt-6">
              <button onClick={() => setShowUserModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700">Kullanıcı Ekle</button>
              <button onClick={() => setShowProductModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700">Ürün Ekle</button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Siparişler ({orders.length})
              </button>
              {user && user.role === 'SUPER_ADMIN' && (
                <>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Kullanıcılar ({sortedUsers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'products'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Ürünler ({products.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('categories')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'categories'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Kategoriler ({categories.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('daily-stats')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'daily-stats'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Günlük İstatistikler
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Tüm Şubelerin Siparişleri ({orders.length})</h2>
            </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Henüz sipariş bulunmuyor</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Sipariş #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {order.totalAmount.toFixed(2)} TL
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Müşteri Bilgileri</h4>
                      {order.customer ? (
                        <div className="text-sm text-gray-600">
                          <p><strong>Ad:</strong> {order.customer.name}</p>
                          <p><strong>Telefon:</strong> {order.customer.phone}</p>
                          {order.customer.address && (
                            <p><strong>Adres:</strong> {order.customer.address}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Müşteri bilgisi yok</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Şube Bilgileri</h4>
                      <div className="text-sm text-gray-600">
                        <p><strong>Şube:</strong> {order.branch.name}</p>
                        <p><strong>Adres:</strong> {order.branch.address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Sipariş Detayları</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {(order.orderItems || order.items || []).map((item: OrderItem) => (
                        <div key={item.id} className="flex justify-between items-center py-2">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-500">{item.product.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.quantity} x {item.price.toFixed(2)} TL</p>
                            <p className="text-sm text-gray-500">{(item.quantity * item.price).toFixed(2)} TL</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Sipariş Detayları</h4>
                      <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                        {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        disabled={order.status === 'PREPARING' || order.status === 'READY' || order.status === 'DELIVERED' || order.status === 'CANCELLED'}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Hazırlanıyor
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        disabled={order.status === 'READY' || order.status === 'DELIVERED' || order.status === 'CANCELLED'}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Hazır
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                        disabled={order.status === 'DELIVERED' || order.status === 'CANCELLED'}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Teslim Edildi
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                        disabled={order.status === 'DELIVERED' || order.status === 'CANCELLED'}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        İptal Et
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && user && user.role === 'SUPER_ADMIN' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Kullanıcı Yönetimi</h2>
                <button 
                  onClick={() => setShowUserModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
                >
                  Yeni Kullanıcı Ekle
                </button>
              </div>
            </div>
            
            {sortedUsers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Henüz kullanıcı bulunmuyor</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {sortedUsers.map((user) => (
                  <div key={user.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'SUPER_ADMIN' 
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'BRANCH_MANAGER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'SUPER_ADMIN' ? 'Süper Admin' : 
                           user.role === 'BRANCH_MANAGER' ? 'Şube Müdürü' : 'Müşteri'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && user && user.role === 'SUPER_ADMIN' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Ürün Yönetimi ({products.length})</h2>
                <button onClick={() => setShowProductModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700">Yeni Ürün Ekle</button>
              </div>
            </div>
            {products.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Henüz ürün bulunmuyor</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {products.map((product) => (
                  <div key={product.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center">
                        {product.image && (
                          <img src={`http://localhost:3001${product.image}`} alt={product.name} className="w-20 h-20 object-cover rounded mr-4" />
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">{product.description}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-gray-600">
                              <strong>Kategori:</strong> {product.category?.name}
                            </span>
                            <span className="text-sm text-gray-600">
                              <strong>Şube:</strong> {product.branch?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <span className="text-lg font-bold text-green-600">
                          ₺{product.price.toFixed(2)}
                        </span>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => editProduct(product)} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Düzenle</button>
                        <button onClick={() => deleteProduct(product.id)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Sil</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && user && user.role === 'SUPER_ADMIN' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Kategori Yönetimi ({categories.length})</h2>
                <button onClick={() => setShowCategoryModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700">Yeni Kategori Ekle</button>
              </div>
            </div>
            {categories.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Henüz kategori bulunmuyor</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {categories.map((category) => (
                  <div key={category.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                      <div className="text-right mr-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {category.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => {
                          setEditingCategory(category);
                          setEditCategoryForm({
                            name: category.name,
                            description: category.description,
                            isActive: category.isActive
                          });
                          setShowEditCategoryModal(true);
                        }} className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700">Düzenle</button>
                        <button onClick={() => deleteCategory(category.id)} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Sil</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Daily Stats Tab */}
        {activeTab === 'daily-stats' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-end md:space-x-4 space-y-2 md:space-y-0">
              <div>
                <label className="block text-sm font-medium text-gray-700">Şube</label>
                <select value={dailyStatsBranchId} onChange={e => setDailyStatsBranchId(e.target.value)} className="border px-3 py-2 rounded w-48">
                  <option value="">Tüm Şubeler</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <button onClick={fetchDailyStats} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 h-10 mt-6">Yenile</button>
            </div>
            <div className="p-6">
              {dailyStatsLoading ? (
                <div className="text-center text-gray-500">Yükleniyor...</div>
              ) : dailyStats.length === 0 ? (
                <div className="text-center text-gray-500">Bugün için istatistik verisi bulunamadı</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dailyStats.map((stat) => (
                    <div key={stat.branchId} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{stat.branchName}</h3>
                        <span className="text-sm text-gray-500">Bugün</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Sipariş Sayısı:</span>
                          <span className="font-bold text-blue-600">{stat.dailyOrders}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Toplam Ciro:</span>
                          <span className="font-bold text-green-600">{typeof stat.dailyRevenue === 'number' ? stat.dailyRevenue.toFixed(2) : '0.00'} ₺</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Kullanıcı Ekle Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Yeni Kullanıcı Ekle</h2>
            <form onSubmit={async e => {
              e.preventDefault();
              try {
                const userData = { 
                  name: userForm.name,
                  email: userForm.email,
                  password: userForm.password,
                  role: userForm.role,
                  ...(userForm.role === 'BRANCH_MANAGER' && userForm.branchId ? { branchId: Number(userForm.branchId) } : {})
                };
                await axios.post('http://localhost:3001/api/admin/users', userData, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Kullanıcı eklendi');
                setShowUserModal(false);
                setUserForm({ name: '', email: '', password: '', role: 'CUSTOMER', branchId: '' });
                // Kullanıcı listesini yenile
                const response = await axios.get('http://localhost:3001/api/admin/users', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(response.data);
              } catch {
                toast.error('Kullanıcı eklenemedi');
              }
            }} className="space-y-4">
              <input required value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Ad Soyad" className="w-full border px-3 py-2 rounded" />
              <input required value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="E-posta" className="w-full border px-3 py-2 rounded" />
              <input required value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Şifre" type="password" className="w-full border px-3 py-2 rounded" />
              <select required value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} className="w-full border px-3 py-2 rounded">
                <option value="CUSTOMER">Müşteri</option>
                <option value="BRANCH_MANAGER">Şube Müdürü</option>
                {user && user.role === 'SUPER_ADMIN' && (
                  <option value="SUPER_ADMIN">Süper Admin</option>
                )}
              </select>
              {userForm.role === 'BRANCH_MANAGER' && (
                <select required value={userForm.branchId} onChange={e => setUserForm(f => ({ ...f, branchId: e.target.value }))} className="w-full border px-3 py-2 rounded">
                  <option value="">Şube Seç</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 rounded bg-gray-200">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Ekle Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Yeni Ürün Ekle</h2>
            <form onSubmit={async e => {
              e.preventDefault();
              try {
                const formData = new FormData();
                formData.append('name', productForm.name);
                formData.append('description', productForm.description);
                formData.append('price', productForm.price);
                formData.append('categoryId', productForm.categoryId);
                formData.append('branchId', productForm.branchId);
                if (productImage) formData.append('image', productImage);

                const response = await axios.post('http://localhost:3001/api/admin/products', formData, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                  }
                });

                if (productForm.branchId === 'all') {
                  toast.success(response.data.message || 'Ürün tüm şubelere başarıyla eklendi');
                } else {
                  toast.success('Ürün başarıyla eklendi');
                }

                setShowProductModal(false);
                setProductForm({ name: '', description: '', price: '', categoryId: '', branchId: '' });
                setProductImage(null);

                // Ürün listesini yenile
                const productsResponse = await axios.get('http://localhost:3001/api/admin/products', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setProducts(productsResponse.data);
              } catch (error: any) {
                toast.error(`Ürün eklenemedi: ${error.response?.data?.error || error.message}`);
              }
            }} className="space-y-4" encType="multipart/form-data">
              <input required value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Ürün Adı" className="w-full border px-3 py-2 rounded" />
              <input value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama" className="w-full border px-3 py-2 rounded" />
              <input required value={productForm.price} onChange={e => setProductForm(f => ({ ...f, price: e.target.value }))} placeholder="Fiyat" type="number" min="0" className="w-full border px-3 py-2 rounded" />
              <select required value={productForm.categoryId} onChange={e => setProductForm(f => ({ ...f, categoryId: e.target.value }))} className="w-full border px-3 py-2 rounded">
                <option value="">Kategori Seç</option>
                <option value="all">Tüm Kategoriler</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select required value={productForm.branchId} onChange={e => setProductForm(f => ({ ...f, branchId: e.target.value }))} className="w-full border px-3 py-2 rounded">
                <option value="">Şube Seç</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="file" accept="image/*" onChange={e => setProductImage(e.target.files?.[0] || null)} className="w-full" />
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowProductModal(false); setProductImage(null); }} className="px-4 py-2 rounded bg-gray-200">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Düzenle Modal */}
      {showEditProductModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Ürün Düzenle</h2>
            <div className="space-y-4">
              <input required value={editProductForm.name} onChange={e => setEditProductForm(f => ({ ...f, name: e.target.value }))} placeholder="Ürün Adı" className="w-full border px-3 py-2 rounded" />
              <input value={editProductForm.description} onChange={e => setEditProductForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama" className="w-full border px-3 py-2 rounded" />
              <input required value={editProductForm.price} onChange={e => setEditProductForm(f => ({ ...f, price: e.target.value }))} placeholder="Fiyat" type="number" min="0" className="w-full border px-3 py-2 rounded" />
              <select required value={editProductForm.categoryId} onChange={e => setEditProductForm(f => ({ ...f, categoryId: e.target.value }))} className="w-full border px-3 py-2 rounded">
                <option value="">Kategori Seç</option>
                <option value="all">Tüm Kategoriler</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select required value={editProductForm.branchId} onChange={e => setEditProductForm(f => ({ ...f, branchId: e.target.value }))} className="w-full border px-3 py-2 rounded">
                <option value="">Şube Seç</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="file" accept="image/*" onChange={e => setEditProductImage(e.target.files?.[0] || null)} className="w-full" />
              {editingProduct.image && !editProductImage && (
                <img src={`http://localhost:3001${editingProduct.image}`} alt="Ürün Görseli" className="w-32 h-32 object-cover rounded" />
              )}
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" checked={editProductForm.isActive} onChange={e => setEditProductForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Aktif</label>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowEditProductModal(false); setEditingProduct(null); setEditProductImage(null); }} className="px-4 py-2 rounded bg-gray-200">İptal</button>
                <button type="button" onClick={async () => {
                  try {
                    const formData = new FormData();
                    formData.append('name', editProductForm.name);
                    formData.append('description', editProductForm.description);
                    formData.append('price', editProductForm.price);
                    formData.append('categoryId', editProductForm.categoryId);
                    formData.append('branchId', editProductForm.branchId);
                    formData.append('isActive', String(editProductForm.isActive));
                    if (editProductImage) formData.append('image', editProductImage);
                    const response = await axios.put(`http://localhost:3001/api/admin/products/${editingProduct.id}`, formData, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                      }
                    });
                    toast.success('Ürün başarıyla güncellendi');
                    setShowEditProductModal(false);
                    setEditingProduct(null);
                    setEditProductImage(null);
                    // Ürün listesini yenile
                    const productsResponse = await axios.get('http://localhost:3001/api/admin/products', {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    setProducts(productsResponse.data);
                  } catch (error: any) {
                    toast.error(`Ürün güncellenemedi: ${error.response?.data?.error || error.message}`);
                  }
                }} className="px-4 py-2 rounded bg-blue-600 text-white">Güncelle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kategori Ekle Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Yeni Kategori Ekle</h2>
            <form onSubmit={async e => {
              e.preventDefault();
              try {
                const categoryData = {
                  name: categoryForm.name,
                  description: categoryForm.description
                };
                await axios.post('http://localhost:3001/api/admin/categories', categoryData, { headers: { Authorization: `Bearer ${token}` } });
                toast.success('Kategori eklendi');
                setShowCategoryModal(false);
                setCategoryForm({ name: '', description: '' });
                // Kategori listesini yenile
                const categoriesResponse = await axios.get('http://localhost:3001/api/admin/categories', { headers: { Authorization: `Bearer ${token}` } });
                setCategories(categoriesResponse.data);
              } catch (error: any) {
                toast.error(`Kategori eklenemedi: ${error.response?.data?.error || error.message}`);
              }
            }} className="space-y-4">
              <input required value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} placeholder="Kategori Adı" className="w-full border px-3 py-2 rounded" />
              <textarea value={categoryForm.description} onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama" className="w-full border px-3 py-2 rounded"></textarea>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 rounded bg-gray-200">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Ekle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kategori Düzenle Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-xl font-bold mb-4">Kategori Düzenle</h2>
            <div className="space-y-4">
              <input required value={editCategoryForm.name} onChange={e => setEditCategoryForm(f => ({ ...f, name: e.target.value }))} placeholder="Kategori Adı" className="w-full border px-3 py-2 rounded" />
              <textarea value={editCategoryForm.description} onChange={e => setEditCategoryForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama" className="w-full border px-3 py-2 rounded"></textarea>
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isActive" checked={editCategoryForm.isActive} onChange={e => setEditCategoryForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                <label htmlFor="isActive" className="text-sm text-gray-700">Aktif</label>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowEditCategoryModal(false); setEditingCategory(null); }} className="px-4 py-2 rounded bg-gray-200">İptal</button>
                <button type="button" onClick={async () => {
                  try {
                    const formData = new FormData();
                    formData.append('name', editCategoryForm.name);
                    formData.append('description', editCategoryForm.description);
                    formData.append('isActive', String(editCategoryForm.isActive));
                    const response = await axios.put(`http://localhost:3001/api/admin/categories/${editingCategory.id}`, formData, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    toast.success('Kategori başarıyla güncellendi');
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                    // Kategori listesini yenile
                    const categoriesResponse = await axios.get('http://localhost:3001/api/admin/categories', { headers: { Authorization: `Bearer ${token}` } });
                    setCategories(categoriesResponse.data);
                  } catch (error: any) {
                    toast.error(`Kategori güncellenemedi: ${error.response?.data?.error || error.message}`);
                  }
                }} className="px-4 py-2 rounded bg-blue-600 text-white">Güncelle</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}