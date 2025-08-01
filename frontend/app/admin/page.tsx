"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { API_ENDPOINTS } from '@/lib/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSocket } from '@/lib/socket';
import { useOptimizedFetch, useOptimizedInterval } from '@/hooks/useOptimizedFetch';
import { useOptimizedList, useOptimizedForm } from '@/hooks/useMemoizedState';
import OrderList from '../components/OrderList';
import UserList from '../components/UserList';
import ProductManagement from '../components/ProductManagement';
import BranchManagement from '../components/BranchManagement';
import ImageSelector from '../../components/ImageSelector';
import Link from 'next/link';
import ChatManagement from './chat-management';
import Dashboard from './dashboard/page';

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
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { on, off } = useSocket();
  
  // Loading state for auth check
  const [authChecking, setAuthChecking] = useState(true);

  // Optimize edilmiş state'ler
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [databaseStats, setDatabaseStats] = useState<any>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);

  // Optimize edilmiş list state'leri
  const { items: branches, setItems: setBranches, updateItem: updateBranchItem } = useOptimizedList<any>();
  const { items: orders, setItems: setOrders, updateItem: updateOrderItem } = useOptimizedList<Order>();
  const { items: categories, setItems: setCategories, updateItem: updateCategoryItem } = useOptimizedList<Category>();
  const { items: products, setItems: setProducts, updateItem: updateProductItem } = useOptimizedList<any>();
  const { items: users, setItems: setUsers, updateItem: updateUserItem } = useOptimizedList<any>();

  // Optimize edilmiş form state'leri
  const { values: userForm, setValue: setUserFormValue, reset: resetUserForm } = useOptimizedForm({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
    branchId: ''
  });

  const { values: productForm, setValue: setProductFormValue, reset: resetProductForm } = useOptimizedForm({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    branchId: '',
    image: ''
  });

  const { values: categoryForm, setValue: setCategoryFormValue, reset: resetCategoryForm } = useOptimizedForm({
    name: '',
    description: ''
  });

  const { values: branchForm, setValue: setBranchFormValue, reset: resetBranchForm } = useOptimizedForm({
    name: '',
    address: '',
    phone: ''
  });

  // Optimize edilmiş fetch hook'ları
  const { data: branchesData, loading: branchesLoading } = useOptimizedFetch<any[]>(
    API_ENDPOINTS.BRANCHES,
    { 
      cacheTime: 5 * 60 * 1000,
      enabled: !!token 
    }
  );

  const { data: categoriesData, loading: categoriesLoading } = useOptimizedFetch<Category[]>(
    API_ENDPOINTS.ADMIN_CATEGORIES,
    { 
      cacheTime: 5 * 60 * 1000,
      enabled: !!token 
    }
  );

  const { data: productsData, loading: productsLoading } = useOptimizedFetch<any[]>(
    API_ENDPOINTS.ADMIN_PRODUCTS,
    { 
      cacheTime: 5 * 60 * 1000,
      enabled: !!token 
    }
  );

  const { data: usersData, loading: usersLoading } = useOptimizedFetch<any[]>(
    API_ENDPOINTS.ADMIN_USERS,
    { 
      cacheTime: 5 * 60 * 1000,
      enabled: !!token 
    }
  );

  // Data'ları set et
  useEffect(() => {
    if (branchesData) {
      setBranches(branchesData);
      if (branchesData.length > 0 && !selectedBranch) {
        setSelectedBranch(branchesData[0]);
      }
    }
  }, [branchesData, setBranches, selectedBranch]);

  useEffect(() => {
    if (categoriesData) {
      setCategories(categoriesData);
    }
  }, [categoriesData, setCategories]);

  useEffect(() => {
    if (productsData) {
      setProducts(productsData);
    }
  }, [productsData, setProducts]);

  useEffect(() => {
    if (usersData) {
      setUsers(usersData);
    }
  }, [usersData, setUsers]);

  // Yetki kontrolü
  useEffect(() => {
    console.log('🔍 Yetki kontrolü - User:', user);
    console.log('🔍 Yetki kontrolü - User role:', user?.role);
    console.log('🔍 Yetki kontrolü - Token:', token ? 'Var' : 'Yok');
    console.log('🔍 Yetki kontrolü - localStorage user:', localStorage.getItem('user'));
    console.log('🔍 Yetki kontrolü - localStorage token:', localStorage.getItem('token'));
    
    // Auth checking tamamlandı
    setAuthChecking(false);
    
    if (!user) {
      console.log('❌ Kullanıcı bulunamadı, ana sayfaya yönlendiriliyor');
      router.push('/');
      return;
    }
    
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'admin' && user.role !== 'BRANCH_MANAGER') {
      console.log('❌ Kullanıcı yetkisiz, ana sayfaya yönlendiriliyor');
      console.log('❌ Kullanıcı rolü:', user.role);
      toast.error('Bu sayfaya erişim yetkiniz yok');
      router.push('/');
      return;
    }
    
    console.log('✅ Kullanıcı yetkili, admin paneline erişim verildi');
  }, [user, token, router]);

  // Optimize edilmiş sipariş yükleme
  const fetchOrders = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_ORDERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Siparişler yüklenemedi:', error);
      if (error.response?.status === 401) {
        toast.error('Oturum süresi dolmuş');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [token, router, setOrders]);

  // Socket event handlers
  const handleNewOrder = useCallback((data: any) => {
    toast.success(`Yeni sipariş: ${data.orderNumber}`);
    fetchOrders();
  }, [fetchOrders]);

  const handleOrderStatusChanged = useCallback((data: any) => {
    toast.success(`Sipariş durumu güncellendi: ${data.orderNumber} - ${data.statusText}`);
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    on('newOrder', handleNewOrder);
    on('orderStatusChanged', handleOrderStatusChanged);

    return () => {
      off('newOrder', handleNewOrder);
      off('orderStatusChanged', handleOrderStatusChanged);
    };
  }, [on, off, handleNewOrder, handleOrderStatusChanged]);

  // Optimize edilmiş interval
  useOptimizedInterval(
    fetchOrders,
    30000,
    !!token && !!user
  );

  // İlk yükleme
  useEffect(() => {
    if (token && user) {
      fetchOrders();
      fetchDatabaseStats();
    }
  }, [token, user, fetchOrders]);

  // Veritabanı istatistiklerini yükle
  const fetchDatabaseStats = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_DATABASE_STATS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatabaseStats(response.data);
    } catch (error: any) {
      console.error('İstatistikler yüklenemedi:', error);
    }
  }, [token]);

  // Manuel temizlik işlemi
  const handleCleanupOrders = useCallback(async () => {
    if (!confirm('Eski siparişleri temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setCleanupLoading(true);
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_CLEANUP_ORDERS, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Eski siparişler başarıyla temizlendi');
      
      await fetchDatabaseStats();
      await fetchOrders();
      
    } catch (error: any) {
      console.error('Temizlik hatası:', error);
      toast.error('Temizlik işlemi başarısız');
    } finally {
      setCleanupLoading(false);
    }
  }, [token, fetchDatabaseStats, fetchOrders]);

  // Optimize edilmiş callback'ler
  const updateOrderStatus = useCallback(async (orderId: number, status: string) => {
    try {
      const response = await axios.patch(
        API_ENDPOINTS.ADMIN_UPDATE_ORDER_STATUS(orderId),
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        updateOrderItem(orderId, (order) => ({
          ...order,
          status
        }));
        toast.success('Sipariş durumu güncellendi');
      }
    } catch (error: any) {
      console.error('Sipariş durumu güncellenemedi:', error);
      toast.error('Sipariş durumu güncellenemedi');
    }
  }, [token, updateOrderItem]);

  // Form submit handlers
  const addUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_USERS, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setUsers(prev => [...prev, response.data]);
        setShowAddUserModal(false);
        resetUserForm();
        toast.success('Kullanıcı eklendi');
      }
    } catch (error: any) {
      console.error('Kullanıcı eklenemedi:', error);
      toast.error('Kullanıcı eklenemedi');
    }
  }, [token, userForm, setUsers, resetUserForm]);

  const addProduct = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_PRODUCTS, productForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        const newProduct = Array.isArray(response.data) ? response.data[0] : response.data;
        setProducts(prev => [...prev, newProduct]);
        setShowAddProductModal(false);
        resetProductForm();
        toast.success('Ürün eklendi');
      }
    } catch (error: any) {
      console.error('Ürün eklenemedi:', error);
      toast.error('Ürün eklenemedi');
    }
  }, [token, productForm, setProducts, resetProductForm]);

  const addCategory = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_CATEGORIES, categoryForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setCategories(prev => [...prev, response.data]);
        setShowAddCategoryModal(false);
        resetCategoryForm();
        toast.success('Kategori eklendi');
      }
    } catch (error: any) {
      console.error('Kategori eklenemedi:', error);
      toast.error('Kategori eklenemedi');
    }
  }, [token, categoryForm, setCategories, resetCategoryForm]);

  const addBranch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_ENDPOINTS.BRANCHES, branchForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setBranches(prev => [...prev, response.data]);
        setShowAddBranchModal(false);
        resetBranchForm();
        toast.success('Şube eklendi');
      }
    } catch (error: any) {
      console.error('Şube eklenemedi:', error);
      toast.error('Şube eklenemedi');
    }
  }, [token, branchForm, setBranches, resetBranchForm]);

  // Utility functions
  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleString('tr-TR');
  }, []);

  const handleImageSelect = useCallback((imagePath: string) => {
    setProductFormValue('image', imagePath);
  }, [setProductFormValue]);

  const handleEditImageSelect = useCallback((imagePath: string) => {
    setProductFormValue('image', imagePath);
  }, [setProductFormValue]);

  // Eksik fonksiyonlar
  const deleteUser = useCallback(async (userId: number) => {
    try {
      await axios.delete(API_ENDPOINTS.ADMIN_DELETE_USER(userId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.filter((user: any) => user.id !== userId));
      toast.success('Kullanıcı silindi');
    } catch (error: any) {
      console.error('Kullanıcı silinemedi:', error);
      toast.error('Kullanıcı silinemedi');
    }
  }, [token, setUsers]);

  const activateUser = useCallback(async (userId: number) => {
    try {
      await axios.patch(API_ENDPOINTS.ADMIN_ACTIVATE_USER(userId), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updateUserItem(userId, (user: any) => ({
        ...user,
        isActive: true
      }));
      toast.success('Kullanıcı aktifleştirildi');
    } catch (error: any) {
      console.error('Kullanıcı aktifleştirilemedi:', error);
      toast.error('Kullanıcı aktifleştirilemedi');
    }
  }, [token, updateUserItem]);

  const editProduct = useCallback((product: any) => {
    setEditingProduct(product);
    setProductFormValue('name', product.name);
    setProductFormValue('description', product.description);
    setProductFormValue('price', product.price.toString());
    setProductFormValue('categoryId', product.categoryId?.toString() || '');
    setProductFormValue('branchId', product.branchId?.toString() || '');
    setProductFormValue('image', product.image || '');
    setShowEditProductModal(true);
  }, [setProductFormValue]);

  const updateProductHandler = useCallback(async () => {
    try {
      const response = await axios.put(
        API_ENDPOINTS.ADMIN_UPDATE_PRODUCT(editingProduct.id),
        productForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        updateProductItem(editingProduct.id, (product: any) => ({
          ...product,
          ...productForm
        }));
        setShowEditProductModal(false);
        resetProductForm();
        toast.success('Ürün güncellendi');
      }
    } catch (error: any) {
      console.error('Ürün güncellenemedi:', error);
      toast.error('Ürün güncellenemedi');
    }
  }, [token, productForm, editingProduct, updateProductItem, resetProductForm]);

  const toggleProductStatus = useCallback(async (productId: number, isActive: boolean) => {
    try {
      await axios.patch(
        API_ENDPOINTS.ADMIN_UPDATE_PRODUCT(productId),
        { isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateProductItem(productId, (product: any) => ({
        ...product,
        isActive
      }));
      toast.success(`Ürün ${isActive ? 'aktifleştirildi' : 'deaktif edildi'}`);
    } catch (error: any) {
      console.error('Ürün durumu güncellenemedi:', error);
      toast.error('Ürün durumu güncellenemedi');
    }
  }, [token, updateProductItem]);

  const deleteProduct = useCallback(async (productId: number) => {
    try {
      await axios.delete(API_ENDPOINTS.ADMIN_DELETE_PRODUCT(productId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(prev => prev.filter((product: any) => product.id !== productId));
      toast.success('Ürün silindi');
    } catch (error: any) {
      console.error('Ürün silinemedi:', error);
      toast.error('Ürün silinemedi');
    }
  }, [token, setProducts]);

  const deleteCategory = useCallback(async (categoryId: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.ADMIN_CATEGORIES}/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(prev => prev.filter((category: Category) => category.id !== categoryId));
      toast.success('Kategori silindi');
    } catch (error: any) {
      console.error('Kategori silinemedi:', error);
      toast.error('Kategori silinemedi');
    }
  }, [token, setCategories]);

  const editCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setCategoryFormValue('name', category.name);
    setCategoryFormValue('description', category.description);
    setShowEditCategoryModal(true);
  }, [setCategoryFormValue]);

  const updateCategoryHandler = useCallback(async () => {
    if (!editingCategory) return;

    try {
      const response = await axios.put(
        `${API_ENDPOINTS.ADMIN_CATEGORIES}/${editingCategory.id}`,
        categoryForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        updateCategoryItem(editingCategory.id, (category: Category) => ({
          ...category,
          ...categoryForm
        }));
        setShowEditCategoryModal(false);
        resetCategoryForm();
        toast.success('Kategori güncellendi');
      }
    } catch (error: any) {
      console.error('Kategori güncellenemedi:', error);
      toast.error('Kategori güncellenemedi');
    }
  }, [token, categoryForm, editingCategory, updateCategoryItem, resetCategoryForm]);

  const editBranch = useCallback((branch: any) => {
    setEditingBranch(branch);
    setBranchFormValue('name', branch.name);
    setBranchFormValue('address', branch.address);
    setBranchFormValue('phone', branch.phone);
    setShowEditBranchModal(true);
  }, [setBranchFormValue]);

  const updateBranchHandler = useCallback(async () => {
    if (!editingBranch) return;

    try {
      const response = await axios.put(
        `${API_ENDPOINTS.BRANCHES}/${editingBranch.id}`,
        branchForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        updateBranchItem(editingBranch.id, (branch: any) => ({
          ...branch,
          ...branchForm
        }));
        setShowEditBranchModal(false);
        resetBranchForm();
        toast.success('Şube güncellendi');
      }
    } catch (error: any) {
      console.error('Şube güncellenemedi:', error);
      toast.error('Şube güncellenemedi');
    }
  }, [token, branchForm, editingBranch, updateBranchItem, resetBranchForm]);

  const deleteBranch = useCallback(async (branchId: number) => {
    try {
      await axios.delete(`${API_ENDPOINTS.BRANCHES}/${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(prev => prev.filter((branch: any) => branch.id !== branchId));
      toast.success('Şube silindi');
    } catch (error: any) {
      console.error('Şube silinemedi:', error);
      toast.error('Şube silinemedi');
    }
  }, [token, setBranches]);

  // Filtrelenmiş siparişler
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (selectedBranch) {
      filtered = filtered.filter(order => order.branch.id === selectedBranch.id);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    if (selectedOrderType !== 'all') {
      filtered = filtered.filter(order => order.orderType === selectedOrderType);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, selectedBranch, selectedStatus, selectedOrderType]);

  // Status utility functions
  const getStatusColor = useCallback((status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PREPARING: 'bg-blue-100 text-blue-800',
      READY: 'bg-green-100 text-green-800',
      DELIVERED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_MANAGER')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Yetkisiz erişim</p>
        </div>
      </div>
    );
  }

  // Loading kontrolü
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">👑 Admin Paneli</h1>
            
            <div className="flex items-center space-x-4">
              {/* Filtreler */}
              <select
                value={selectedBranch?.id || ''}
                onChange={(e) => {
                  const branch = branches.find(b => b.id === parseInt(e.target.value));
                  setSelectedBranch(branch);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Şubeler</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="PENDING">Bekliyor</option>
                <option value="PREPARING">Hazırlanıyor</option>
                <option value="READY">Hazır</option>
                <option value="DELIVERED">Teslim Edildi</option>
                <option value="CANCELLED">İptal Edildi</option>
              </select>

              <select
                value={selectedOrderType}
                onChange={(e) => setSelectedOrderType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tüm Tipler</option>
                <option value="DELIVERY">Teslimat</option>
                <option value="TABLE">Masa</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Siparişler yükleniyor...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Siparişler */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Siparişler ({filteredOrders.length})</h2>
              
              {filteredOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sipariş bulunmuyor</p>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">#{order.orderNumber}</h3>
                          <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {order.orderType === 'DELIVERY' ? '🚚 Teslimat' : '🍽️ Masa'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Şube</p>
                          <p className="text-sm text-gray-600">{order.branch.name}</p>
                        </div>
                        {order.customer && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Müşteri</p>
                            <p className="text-sm text-gray-600">{order.customer.name}</p>
                            <p className="text-sm text-gray-600">{order.customer.phone}</p>
                          </div>
                        )}
                        {order.table && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Masa</p>
                            <p className="text-sm text-gray-600">Masa {order.table.number}</p>
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Ürünler:</p>
                        <div className="space-y-1">
                          {order.orderItems?.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.product.name}</span>
                              <span className="text-gray-600">₺{item.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-bold text-gray-900">Toplam: ₺{order.totalAmount}</p>
                          {order.notes && (
                            <p className="text-sm text-gray-600 mt-1">Not: {order.notes}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                              Hazırlamaya Başla
                            </button>
                          )}
                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'READY')}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                            >
                              Hazır
                            </button>
                          )}
                          {order.status === 'READY' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                            >
                              Teslim Edildi
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Veritabanı İstatistikleri */}
            {databaseStats && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Veritabanı İstatistikleri</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{databaseStats.stats.totalOrders}</div>
                    <div className="text-sm text-blue-600">Toplam Sipariş</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{databaseStats.stats.oldOrders}</div>
                    <div className="text-sm text-yellow-600">12 Saatten Eski</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{databaseStats.stats.activeOrders}</div>
                    <div className="text-sm text-green-600">Aktif Sipariş</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{databaseStats.stats.completedOrders}</div>
                    <div className="text-sm text-purple-600">Tamamlanmış</div>
                  </div>
                </div>
                
                {/* Bellek Kullanımı */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">💾 Bellek Kullanımı</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">RSS</div>
                      <div className="text-lg font-semibold">{databaseStats.memory.rss} MB</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Heap Used</div>
                      <div className="text-lg font-semibold">{databaseStats.memory.heapUsed} MB</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Heap Total</div>
                      <div className="text-lg font-semibold">{databaseStats.memory.heapTotal} MB</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Yönetim Butonları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                👤 Kullanıcı Ekle
              </button>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                🍽️ Ürün Ekle
              </button>
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="bg-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-600 transition-colors"
              >
                📂 Kategori Ekle
              </button>
              <button
                onClick={() => setShowAddBranchModal(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                🏢 Şube Ekle
              </button>
            </div>

            {/* Temizlik Butonları */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-red-800 mb-4">🧹 Veritabanı Temizliği</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCleanupOrders}
                  disabled={cleanupLoading}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {cleanupLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Temizleniyor...
                    </>
                  ) : (
                    '🗑️ Eski Siparişleri Temizle'
                  )}
                </button>
                <div className="text-sm text-red-600">
                  ⚠️ Bu işlem 12 saatten eski tamamlanmış siparişleri kalıcı olarak siler
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Kullanıcı Ekleme Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">👤 Kullanıcı Ekle</h3>
            <form onSubmit={addUser}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ad Soyad"
                  value={userForm.name}
                  onChange={(e) => setUserFormValue('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="email"
                  placeholder="E-posta"
                  value={userForm.email}
                  onChange={(e) => setUserFormValue('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={userForm.phone}
                  onChange={(e) => setUserFormValue('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <input
                  type="password"
                  placeholder="Şifre"
                  value={userForm.password}
                  onChange={(e) => setUserFormValue('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserFormValue('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="CUSTOMER">Müşteri</option>
                  <option value="BRANCH_MANAGER">Şube Yöneticisi</option>
                  <option value="SUPER_ADMIN">Süper Admin</option>
                </select>
                <select
                  value={userForm.branchId}
                  onChange={(e) => setUserFormValue('branchId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Şube Seçin</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Ekleme Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">🍽️ Ürün Ekle</h3>
            <form onSubmit={addProduct}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ürün Adı"
                  value={productForm.name}
                  onChange={(e) => setProductFormValue('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <textarea
                  placeholder="Açıklama"
                  value={productForm.description}
                  onChange={(e) => setProductFormValue('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
                <input
                  type="number"
                  placeholder="Fiyat"
                  value={productForm.price}
                  onChange={(e) => setProductFormValue('price', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductFormValue('categoryId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
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
                  onChange={(e) => setProductFormValue('branchId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Şube Seçin</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowImageSelector(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  >
                    {productForm.image ? 'Resim Seçildi' : 'Resim Seç'}
                  </button>
                  {showImageSelector && (
                    <ImageSelector 
                      isOpen={showImageSelector}
                      onClose={() => setShowImageSelector(false)}
                      onSelect={handleImageSelect}
                      selectedImage={productForm.image}
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kategori Ekleme Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">📂 Kategori Ekle</h3>
            <form onSubmit={addCategory}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Kategori Adı"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryFormValue('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <textarea
                  placeholder="Açıklama"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryFormValue('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Şube Ekleme Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">🏢 Şube Ekle</h3>
            <form onSubmit={addBranch}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Şube Adı"
                  value={branchForm.name}
                  onChange={(e) => setBranchFormValue('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <textarea
                  placeholder="Adres"
                  value={branchForm.address}
                  onChange={(e) => setBranchFormValue('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={branchForm.phone}
                  onChange={(e) => setBranchFormValue('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}