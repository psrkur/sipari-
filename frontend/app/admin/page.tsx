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
import Link from 'next/link';

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
  orderType: string; // 'DELIVERY' veya 'TABLE'
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
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'products' | 'categories' | 'branches' | 'daily-stats' | 'tables' | 'table-orders'>('orders');
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
    if (!token) {
      console.log('Token bulunamadı, giriş sayfasına yönlendiriliyor');
      router.push('/login');
      return;
    }

    // API calls with proper error handling
    const fetchData = async () => {
      try {
        // Fetch branches
        const branchesResponse = await axios.get(API_ENDPOINTS.BRANCHES, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setBranches(branchesResponse.data);
      } catch (error: any) {
        console.error('Branches fetch error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          router.push('/login');
          return;
        }
        setBranches([]);
      }

      try {
        // Fetch categories
        const categoriesResponse = await axios.get(API_ENDPOINTS.ADMIN_CATEGORIES, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        setCategories(categoriesResponse.data);
      } catch (error: any) {
        console.error('Categories fetch error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          router.push('/login');
          return;
        }
        setCategories([]);
      }

      // Fetch products for all users
      try {
        let productsResponse;
        if (user && user.role === 'BRANCH_MANAGER') {
          productsResponse = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, { 
            headers: { Authorization: `Bearer ${token}` },
            params: { branchId: user.branchId }
          });
        } else {
          productsResponse = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
        }
        setProducts(productsResponse.data);
        console.log('Products loaded:', productsResponse.data);
      } catch (error: any) {
        console.error('Products fetch error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          router.push('/login');
          return;
        }
        setProducts([]);
      }
      
      if (user && user.role === 'SUPER_ADMIN') {
        try {
          const usersResponse = await axios.get(API_ENDPOINTS.ADMIN_USERS, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          setUsers(usersResponse.data);
        } catch (error: any) {
          console.error('Users fetch error:', error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
            router.push('/login');
            return;
          }
          setUsers([]);
        }
      }

      // Fetch orders for all users
      try {
        const ordersResponse = await axios.get(API_ENDPOINTS.ADMIN_ORDERS, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(ordersResponse.data);
        console.log('Orders loaded:', ordersResponse.data);
      } catch (error: any) {
        console.error('Orders fetch error:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          router.push('/login');
          return;
        }
        setOrders([]);
      }
    };

    fetchData();
  }, [token, user, router]);

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
    } catch (error: any) {
      console.error('Orders fetch error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        router.push('/login');
        return;
      }
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
      if (error.response?.status === 400 && error.response?.data?.error === 'Teslim edilen siparişler güncellenemez') {
        toast.error('Bu sipariş zaten teslim edilmiş ve artık değiştirilemez.');
      } else if (error.response?.status === 400 && error.response?.data?.error === 'İptal edilen siparişler güncellenemez') {
        toast.error('Bu sipariş zaten iptal edilmiş ve artık değiştirilemez.');
      } else {
        toast.error(`Sipariş durumu güncellenemedi: ${error.response?.data?.error || error.message}`);
      }
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

  const activateUser = async (userId: number) => {
    if (!confirm('Bu kullanıcıyı onaylamak istediğinizden emin misiniz?')) return;
    
    try {
      await axios.put(API_ENDPOINTS.ADMIN_ACTIVATE_USER(userId), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Kullanıcı onaylandı');
      const response = await axios.get(API_ENDPOINTS.ADMIN_USERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Kullanıcı onaylanamadı');
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
      const formData = new FormData();
      
      if (user && user.role === 'BRANCH_MANAGER') {
        // Şube müdürleri sadece isActive değerini güncelleyebilir
        formData.append('isActive', editProductForm.isActive ? 'true' : 'false');
      } else {
        // Süper admin tüm alanları güncelleyebilir
        formData.append('name', editProductForm.name);
        formData.append('description', editProductForm.description);
        formData.append('price', String(Number(editProductForm.price)));
        formData.append('categoryId', String(Number(editProductForm.categoryId)));
        formData.append('branchId', String(Number(editProductForm.branchId)));
        formData.append('isActive', editProductForm.isActive ? 'true' : 'false');
        
        if (editProductImage) {
          console.log('Güncelleme için resim yükleniyor:', editProductImage.name);
          formData.append('image', editProductImage);
        }
      }

      console.log('Güncelleme FormData içeriği:');
      formData.forEach((value, key) => {
        console.log(key, value);
      });

      await axios.put(API_ENDPOINTS.ADMIN_UPDATE_PRODUCT(editingProduct.id), formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success(user && user.role === 'BRANCH_MANAGER' ? 'Ürün durumu güncellendi' : 'Ürün başarıyla güncellendi');
      setShowEditProductModal(false);
      setEditingProduct(null);
      setEditProductImage(null);
      
      const productsResponse = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(productsResponse.data);
    } catch (error: any) {
      console.error('Ürün güncelleme hatası:', error);
      toast.error(`Ürün güncellenemedi: ${error.response?.data?.error || error.message}`);
    }
  };

  const toggleProductStatus = async (productId: number, isActive: boolean) => {
    console.log('Toggle fonksiyonu çağrıldı:', { productId, isActive });
    try {
      // Sadece isActive değerini güncellemek için JSON gönder
      const updateData = { isActive: isActive };

      console.log('API çağrısı yapılıyor:', API_ENDPOINTS.ADMIN_UPDATE_PRODUCT(productId));
      console.log('Güncellenecek veri:', updateData);

      await axios.put(API_ENDPOINTS.ADMIN_UPDATE_PRODUCT(productId), updateData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API çağrısı başarılı');
      toast.success(`Ürün ${isActive ? 'aktif' : 'pasif'} yapıldı`);
      
      // Ürünleri yeniden yükle
      const productsResponse = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(productsResponse.data);
      console.log('Ürünler yeniden yüklendi');
    } catch (error: any) {
      console.error('Ürün durumu güncelleme hatası:', error);
      console.error('Hata detayları:', error.response?.data);
      console.error('Response status:', error.response?.status);
      console.error('Response headers:', error.response?.headers);
      toast.error(`Ürün durumu güncellenemedi: ${error.response?.data?.error || error.message}`);
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
      
      // Backend'den gelen veriyi frontend formatına dönüştür
      const formattedStats = [];
      
      if (res.data && Array.isArray(res.data)) {
        for (const branchStats of res.data) {
          formattedStats.push(
            { label: 'Toplam Sipariş', value: branchStats.orders },
            { label: 'Toplam Gelir', value: `${branchStats.revenue.toFixed(2)} ₺` },
            { label: 'Ortalama Sipariş', value: `${branchStats.averageOrder.toFixed(2)} ₺` },
            { label: 'Günlük Ortalama', value: `${branchStats.dailyAverage.toFixed(2)} ₺` }
          );
        }
      }
      
      setStats(formattedStats);
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
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Admin Paneli</h1>
        </div>
        <div className="container mx-auto px-2 sm:px-4 md:px-8" style={{ maxWidth: 1200 }}>
          {/* Tab/menü alanı */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Siparişler ({orders.length})
            </button>
            {user && user.role === 'SUPER_ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Kullanıcılar ({users.length})
                </button>
                <button
                  onClick={() => setActiveTab('branches')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeTab === 'branches' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Şubeler ({branches.length})
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'products' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Ürünler ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Kategoriler ({categories.length})
            </button>
            <button
              onClick={() => setActiveTab('daily-stats')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'daily-stats' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              İstatistikler
            </button>
            <button
              onClick={() => setActiveTab('table-orders')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'table-orders' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Masa Siparişleri
            </button>
            {user && user.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'tables' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Masa Yönetimi
              </button>
            )}
          </div>

          {/* İçerik alanı */}
          <div className="bg-white rounded-lg shadow">
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
                onActivateUser={activateUser}
              />
            )}
            
            {activeTab === 'branches' && user && user.role === 'SUPER_ADMIN' && (
              <BranchManagement
                branches={branches}
                onEditBranch={editBranch}
                onDeleteBranch={deleteBranch}
              />
            )}
            
            {activeTab === 'products' && (
              <ProductManagement
                products={products}
                categories={categories}
                branches={branches}
                onEditProduct={editProduct}
                onDeleteProduct={deleteProduct}
                onToggleProductStatus={toggleProductStatus}
                user={user}
              />
            )}
            
            {activeTab === 'categories' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Kategoriler</h2>
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Yeni Kategori Ekle
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategori Adı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Açıklama
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {categories.map((category) => (
                        <tr key={category.id}>
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
                            <button
                              onClick={() => deleteCategory(category.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeTab === 'daily-stats' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Günlük İstatistikler</h2>
                  <div className="flex gap-2">
                    <select
                      value={statsPeriod}
                      onChange={(e) => setStatsPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="daily">Günlük</option>
                      <option value="weekly">Haftalık</option>
                      <option value="monthly">Aylık</option>
                    </select>
                    {user && user.role === 'SUPER_ADMIN' && (
                      <select
                        value={statsBranchId}
                        onChange={(e) => setStatsBranchId(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="">Tüm Şubeler</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                {statsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">İstatistikler yükleniyor...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.map((stat, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-900">{stat.label}</h3>
                        <p className="text-2xl font-bold text-blue-600">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'table-orders' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Masa Sipariş Yönetimi</h2>
                  <button
                    onClick={() => window.open('/table-order', '_blank')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Yeni Masa Siparişi
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {branches.map((branch) => (
                    <div key={branch.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{branch.name}</h3>
                        <span className="text-sm text-gray-500">{branch.address}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Masa Sayısı:</span>
                          <span className="font-medium">3</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Aktif Siparişler:</span>
                          <span className="font-medium text-green-600">
                            {orders.filter(order => 
                              order.branch.id === branch.id && 
                              order.orderType === 'TABLE' && 
                              order.status !== 'COMPLETED' &&
                              order.orderType !== 'COLLECTION'
                            ).length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Toplam Gelir:</span>
                          <span className="font-medium text-blue-600">
                            ₺{orders
                              .filter(order => 
                                order.branch.id === branch.id && 
                                order.orderType === 'TABLE' &&
                                order.orderType !== 'COLLECTION'
                              )
                              .reduce((total, order) => total + order.totalAmount, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t">
                        <button
                          onClick={() => window.open(`/table-order?branch=${branch.id}`, '_blank')}
                          className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700"
                        >
                          Masa Siparişi Al
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Aktif Masa Siparişleri</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sipariş No
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Masa
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Şube
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tutar
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Durum
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarih
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders
                          .filter(order => order.orderType === 'TABLE' && order.orderType !== 'COLLECTION')
                          .map((order) => (
                            <tr key={order.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {order.orderNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.table?.number || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.branch.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ₺{order.totalAmount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                  {getStatusText(order.status)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(order.createdAt)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'tables' && user && user.role === 'SUPER_ADMIN' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Masa Yönetimi</h2>
                  <Link
                    href="/admin/table-management"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Masa Yönetimi Sayfasına Git
                  </Link>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Masa Yönetimi Özellikleri</h3>
                  <ul className="space-y-2 text-blue-700">
                    <li>• Şube bazlı masa oluşturma ve düzenleme</li>
                    <li>• Her masa için QR kod oluşturma</li>
                    <li>• Masa siparişlerini görüntüleme ve yönetme</li>
                    <li>• Masa tahsilat işlemleri</li>
                    <li>• Masa sıfırlama işlemleri</li>
                  </ul>
                  <p className="mt-3 text-sm text-blue-600">
                    Detaylı masa yönetimi için yukarıdaki butona tıklayın.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}