"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { API_ENDPOINTS } from '../../lib/api';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import OrderList from '../components/OrderList';
import UserList from '../components/UserList';
import ProductManagement from '../components/ProductManagement';
import BranchManagement from '../components/BranchManagement';

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
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branches, setBranches] = useState<{id:number, name:string, address:string, phone:string, isActive:boolean}[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER', branchId: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', categoryId: '', branchId: '' });
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', price: '', categoryId: '', branchId: '', isActive: true });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', description: '', isActive: true });
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [editBranchForm, setEditBranchForm] = useState({ name: '', address: '', phone: '', isActive: true });
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'products' | 'categories' | 'branches' | 'daily-stats'>('orders');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsBranchId, setStatsBranchId] = useState('');
  const [statsPeriod, setStatsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_MANAGER')) {
      router.push('/login');
      return;
    }
    fetchOrders();
  }, [user, router]);

  useEffect(() => {
    axios.get(API_ENDPOINTS.BRANCHES, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setBranches(res.data))
      .catch(() => setBranches([]));
    
    axios.get(API_ENDPOINTS.ADMIN_CATEGORIES, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setCategories(res.data))
      .catch(() => setCategories([]));
    
    if (user && user.role === 'SUPER_ADMIN') {
      axios.get(API_ENDPOINTS.ADMIN_USERS, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUsers(res.data))
        .catch(() => setUsers([]));
      
      axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setProducts(res.data))
        .catch(() => setProducts([]));
    }
  }, [token, user]);

  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === 'SUPER_ADMIN') return -1;
    if (b.role === 'SUPER_ADMIN') return 1;
    return 0;
  });

  useEffect(() => {
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_MANAGER')) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, [user, token]);

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

  useEffect(() => {
    if (orders.length > lastOrderCount && lastOrderCount > 0) {
      playNotificationSound();
      toast.success('Yeni sipariş geldi! 🎉');
    }
    setLastOrderCount(orders.length);
  }, [orders.length, lastOrderCount]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_ORDERS, {
        headers: { Authorization: `Bearer ${token}` }
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
      await axios.put(API_ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(orderId), 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Sipariş durumu güncellendi');
      fetchOrders();
    } catch (error: any) {
      toast.error(`Sipariş durumu güncellenemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PREPARING': return 'bg-blue-100 text-blue-800';
      case 'READY': return 'bg-green-100 text-green-800';
      case 'DELIVERED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const deleteUser = async (userId: number) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(API_ENDPOINTS.ADMIN_DELETE_USER(userId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı silindi');
      const response = await axios.get(API_ENDPOINTS.ADMIN_USERS, {
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
      await axios.put(API_ENDPOINTS.ADMIN_UPDATE_PRODUCT(editingProduct.id), {
        name: editProductForm.name,
        description: editProductForm.description,
        price: Number(editProductForm.price),
        categoryId: editProductForm.categoryId === 'all' ? 'all' : Number(editProductForm.categoryId),
        branchId: editProductForm.branchId === 'all' ? 'all' : Number(editProductForm.branchId),
        isActive: editProductForm.isActive
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Ürün başarıyla güncellendi');
      setShowEditProductModal(false);
      setEditingProduct(null);
      
      const productsResponse = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, {
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
      await axios.delete(API_ENDPOINTS.ADMIN_DELETE_PRODUCT(productId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ürün silindi');
      
      const response = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      toast.error('Ürün silinemedi');
    }
  };

  const deleteCategory = async (categoryId: number) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await axios.delete(API_ENDPOINTS.ADMIN_DELETE_CATEGORY(categoryId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kategori başarıyla silindi');
      const response = await axios.get(API_ENDPOINTS.ADMIN_CATEGORIES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error: any) {
      toast.error(`Kategori silinemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  // Şube yönetimi fonksiyonları
  const editBranch = (branch: any) => {
    setEditingBranch(branch);
    setEditBranchForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive
    });
    setShowEditBranchModal(true);
  };

  const updateBranch = async () => {
    try {
      await axios.put(API_ENDPOINTS.ADMIN_UPDATE_BRANCH(editingBranch.id), editBranchForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şube başarıyla güncellendi');
      setShowEditBranchModal(false);
      setEditingBranch(null);
      setEditBranchForm({ name: '', address: '', phone: '', isActive: true });
      
      // Şubeleri yeniden yükle
      const response = await axios.get(API_ENDPOINTS.BRANCHES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data);
    } catch (error: any) {
      toast.error(`Şube güncellenemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  const deleteBranch = async (branchId: number) => {
    if (!confirm('Bu şubeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      await axios.delete(API_ENDPOINTS.ADMIN_DELETE_BRANCH(branchId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Şube başarıyla silindi');
      
      // Şubeleri yeniden yükle
      const response = await axios.get(API_ENDPOINTS.BRANCHES, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(response.data);
    } catch (error: any) {
      toast.error(`Şube silinemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const params: any = { period: statsPeriod };
      
      if (user && user.role === 'BRANCH_MANAGER' && user.branchId) {
        params.branchId = user.branchId;
      } else if (statsBranchId) {
        params.branchId = statsBranchId;
      }
      
      const res = await axios.get(API_ENDPOINTS.ADMIN_STATS, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setStats(res.data);
    } catch (error) {
      console.error('İstatistik hatası:', error);
      setStats([]);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily-stats') {
      fetchStats();
    }
  }, [activeTab, statsBranchId, statsPeriod]);

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
              <h1 className="text-3xl font-bold text-gray-900">
                {user && user.role === 'BRANCH_MANAGER' ? 'Şube Yönetim Paneli' : 'Admin Paneli'}
              </h1>
              <p className="mt-2 text-gray-600">
                {user && user.role === 'BRANCH_MANAGER' ? 'Şubenizin siparişlerini takip edin ve yönetin' : 'Gelen siparişleri takip edin ve yönetin'}
              </p>
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
              <button onClick={() => setShowBranchModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700">Şube Ekle</button>
            </div>
          )}
        </div>

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
                    onClick={() => setActiveTab('branches')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'branches'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Şubeler ({branches.length})
                  </button>
                </>
              )}
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
            </nav>
          </div>
        </div>

        {activeTab === 'orders' && (
          <OrderList
            orders={orders}
            onUpdateStatus={updateOrderStatus}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'users' && user && user.role === 'SUPER_ADMIN' && (
          <UserList
            users={sortedUsers}
            onDeleteUser={deleteUser}
          />
        )}

        {activeTab === 'products' && user && user.role === 'SUPER_ADMIN' && (
          <ProductManagement
            products={products}
            categories={categories}
            branches={branches}
            onEditProduct={editProduct}
            onDeleteProduct={deleteProduct}
          />
        )}

        {activeTab === 'categories' && user && user.role === 'SUPER_ADMIN' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Kategoriler ({categories.length})</h2>
                <button 
                  onClick={() => setShowCategoryModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
                >
                  Kategori Ekle
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori Adı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {category.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                          setEditingCategory(category);
                          setEditCategoryForm({
                            name: category.name,
                                description: category.description || '',
                            isActive: category.isActive
                          });
                          setShowEditCategoryModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Sil
                          </button>
                      </div>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
              </div>
          </div>
        )}

        {activeTab === 'branches' && user && user.role === 'SUPER_ADMIN' && (
          <BranchManagement
            branches={branches}
            onEditBranch={editBranch}
            onDeleteBranch={deleteBranch}
          />
        )}

        {activeTab === 'daily-stats' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Günlük İstatistikler</h2>
                <div className="flex space-x-4">
                {user && user.role === 'SUPER_ADMIN' && (
                    <select
                      value={statsBranchId}
                      onChange={(e) => setStatsBranchId(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Tüm Şubeler</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                )}
                  <select
                    value={statsPeriod}
                    onChange={(e) => setStatsPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="daily">Günlük</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6">
              {statsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">İstatistikler yükleniyor...</p>
                </div>
              ) : stats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{stat.branchName}</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sipariş Sayısı:</span>
                          <span className="font-semibold">{stat.orders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Gelir:</span>
                          <span className="font-semibold text-green-600">₺{stat.revenue?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ortalama Sipariş:</span>
                          <span className="font-semibold">₺{stat.averageOrder?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Günlük Ortalama:</span>
                          <span className="font-semibold text-blue-600">₺{stat.dailyAverage?.toFixed(2) || '0.00'}</span>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Bu dönem için istatistik verisi bulunamadı.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Kullanıcı Ekle</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="E-posta"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="password"
                  placeholder="Şifre"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="CUSTOMER">Müşteri</option>
                  <option value="BRANCH_MANAGER">Şube Yöneticisi</option>
                  <option value="SUPER_ADMIN">Süper Admin</option>
                </select>
                {userForm.role === 'BRANCH_MANAGER' && (
                  <select
                    value={userForm.branchId}
                    onChange={(e) => setUserForm({...userForm, branchId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Şube Seçin</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.post(API_ENDPOINTS.ADMIN_USERS, userForm, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      toast.success('Kullanıcı başarıyla eklendi');
                setShowUserModal(false);
                setUserForm({ name: '', email: '', password: '', role: 'CUSTOMER', branchId: '' });
                const response = await axios.get(API_ENDPOINTS.ADMIN_USERS, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(response.data);
                    } catch (error: any) {
                      toast.error(`Kullanıcı eklenemedi: ${error.response?.data?.error || error.message}`);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Ekle
                </button>
              </div>
          </div>
        </div>
      )}

        {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Ürün Ekle</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ürün Adı"
                  value={productForm.name}
                  onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  placeholder="Açıklama"
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                <input
                  type="number"
                  placeholder="Fiyat"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Kategori Seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  value={productForm.branchId}
                  onChange={(e) => setProductForm({...productForm, branchId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Şube Seçin</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
              try {
                const formData = new FormData();
                formData.append('name', productForm.name);
                formData.append('description', productForm.description);
                formData.append('price', productForm.price);
                formData.append('categoryId', productForm.categoryId);
                formData.append('branchId', productForm.branchId);
                      if (productImage) {
                        formData.append('image', productImage);
                      }

                      await axios.post(API_ENDPOINTS.ADMIN_PRODUCTS, formData, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                  }
                });
                  toast.success('Ürün başarıyla eklendi');
                setShowProductModal(false);
                setProductForm({ name: '', description: '', price: '', categoryId: '', branchId: '' });
                setProductImage(null);
                      const response = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                      setProducts(response.data);
              } catch (error: any) {
                toast.error(`Ürün eklenemedi: ${error.response?.data?.error || error.message}`);
              }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Ekle
                </button>
              </div>
          </div>
        </div>
      )}

        {/* Edit Product Modal */}
      {showEditProductModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Ürün Düzenle</h3>
            <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ürün Adı"
                  value={editProductForm.name}
                  onChange={(e) => setEditProductForm({...editProductForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  placeholder="Açıklama"
                  value={editProductForm.description}
                  onChange={(e) => setEditProductForm({...editProductForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                <input
                  type="number"
                  placeholder="Fiyat"
                  value={editProductForm.price}
                  onChange={(e) => setEditProductForm({...editProductForm, price: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <select
                  value={editProductForm.categoryId}
                  onChange={(e) => setEditProductForm({...editProductForm, categoryId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Kategori Seçin</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
                <select
                  value={editProductForm.branchId}
                  onChange={(e) => setEditProductForm({...editProductForm, branchId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Şube Seçin</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editProductForm.isActive}
                    onChange={(e) => setEditProductForm({...editProductForm, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditProductImage(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={updateProduct}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Güncelle
                </button>
            </div>
          </div>
        </div>
      )}

        {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Kategori Ekle</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Kategori Adı"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  placeholder="Açıklama"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.post(API_ENDPOINTS.ADMIN_CATEGORIES, categoryForm, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      toast.success('Kategori başarıyla eklendi');
                setShowCategoryModal(false);
                setCategoryForm({ name: '', description: '' });
                      const response = await axios.get(API_ENDPOINTS.ADMIN_CATEGORIES, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                      setCategories(response.data);
                  } catch (error: any) {
                toast.error(`Kategori eklenemedi: ${error.response?.data?.error || error.message}`);
              }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Ekle
                </button>
            </div>
          </div>
        </div>
      )}

        {/* Branch Modal */}
        {showBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Şube Ekle</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Şube Adı"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({...branchForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  placeholder="Adres"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({...branchForm, address: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                <input
                  type="text"
                  placeholder="Telefon"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.post(API_ENDPOINTS.BRANCHES, branchForm, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      toast.success('Şube başarıyla eklendi');
                      setShowBranchModal(false);
                      setBranchForm({ name: '', address: '', phone: '' });
                      const response = await axios.get(API_ENDPOINTS.BRANCHES, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setBranches(response.data);
              } catch (error: any) {
                      toast.error(`Şube eklenemedi: ${error.response?.data?.error || error.message}`);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Ekle
                </button>
              </div>
          </div>
        </div>
      )}

        {/* Edit Branch Modal */}
        {showEditBranchModal && editingBranch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Şube Düzenle</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Şube Adı"
                  value={editBranchForm.name}
                  onChange={(e) => setEditBranchForm({...editBranchForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  placeholder="Adres"
                  value={editBranchForm.address}
                  onChange={(e) => setEditBranchForm({...editBranchForm, address: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                <input
                  type="text"
                  placeholder="Telefon"
                  value={editBranchForm.phone}
                  onChange={(e) => setEditBranchForm({...editBranchForm, phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editBranchForm.isActive}
                    onChange={(e) => setEditBranchForm({...editBranchForm, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditBranchModal(false);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={updateBranch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Kategori Düzenle</h3>
            <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Kategori Adı"
                  value={editCategoryForm.name}
                  onChange={(e) => setEditCategoryForm({...editCategoryForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <textarea
                  placeholder="Açıklama"
                  value={editCategoryForm.description}
                  onChange={(e) => setEditCategoryForm({...editCategoryForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editCategoryForm.isActive}
                    onChange={(e) => setEditCategoryForm({...editCategoryForm, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                  try {
                      await axios.put(API_ENDPOINTS.ADMIN_UPDATE_CATEGORY(editingCategory.id), editCategoryForm, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    toast.success('Kategori başarıyla güncellendi');
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                      const response = await axios.get(API_ENDPOINTS.ADMIN_CATEGORIES, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setCategories(response.data);
                  } catch (error: any) {
                    toast.error(`Kategori güncellenemedi: ${error.response?.data?.error || error.message}`);
                  }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Güncelle
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}