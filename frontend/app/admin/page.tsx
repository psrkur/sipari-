"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth';
import { API_ENDPOINTS } from '../../lib/api';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', price: '', categoryId: '', branchId: '', isActive: true as boolean });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', description: '', isActive: true as boolean });
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
  const [editBranchForm, setEditBranchForm] = useState({ name: '', address: '', phone: '', isActive: true as boolean });
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'products' | 'categories' | 'branches' | 'daily-stats' | 'tables' | 'table-orders'>('orders');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsBranchId, setStatsBranchId] = useState('');
  const [statsPeriod, setStatsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [companies, setCompanies] = useState<{id:number, name:string}[]>([]);
  
  // Kullanıcıları sırala - bu satırı kaldırıyoruz çünkü aşağıda tekrar tanımlanıyor


  useEffect(() => {
    console.log('🔧 Environment Debug:');
    console.log('🔧 Current user:', user);
    console.log('🔧 User role:', user?.role);
    console.log('🔧 User ID:', user?.id);
    console.log('🔧 User email:', user?.email);
    console.log('🔧 Environment:', process.env.NODE_ENV);
    console.log('🔧 Is production:', process.env.NODE_ENV === 'production');
    console.log('🔧 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🔧 User object full:', JSON.stringify(user, null, 2));
    console.log('🔧 User role type:', typeof user?.role);
    console.log('🔧 User role comparison:', user?.role === 'SUPER_ADMIN');
    console.log('🔧 User role comparison (strict):', user?.role === 'SUPER_ADMIN' ? 'true' : 'false');
    console.log('🔧 Window location:', typeof window !== 'undefined' ? window.location.href : 'SSR');
    console.log('🔧 Document ready state:', typeof document !== 'undefined' ? document.readyState : 'SSR');
    
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'BRANCH_MANAGER')) {
      console.log('User not authorized, redirecting to login');
      router.push('/login');
      return;
    }
    console.log('User authorized, fetching orders');
    fetchOrders();

    // Canlı ortamda fallback mekanizması
    if (typeof window !== 'undefined') {
      console.log('🔧 Fallback mekanizması aktif');
      
      // Global fonksiyonları ekle
      (window as any).editProductTest = editProduct;
      (window as any).showEditProductModal = setShowEditProductModal;
      (window as any).setEditingProduct = setEditingProduct;
      (window as any).setEditProductForm = setEditProductForm;
      
      // Event listener'ları manuel olarak ekle
      setTimeout(() => {
        const editButtons = document.querySelectorAll('[data-testid="edit-product-button"]');
        console.log('🔧 Bulunan edit butonları:', editButtons.length);
        
        editButtons.forEach((button, index) => {
          const productId = button.getAttribute('data-product-id');
          console.log(`🔧 Buton ${index}:`, productId);
          
          // Mevcut event listener'ları temizle
          button.removeEventListener('click', (e) => {});
          
          // Yeni event listener ekle
          button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔧 Manuel event listener tetiklendi');
            console.log('🔧 Product ID:', productId);
            
            // Ürünü bul
            const product = products.find(p => p.id.toString() === productId);
            if (product) {
              console.log('🔧 Ürün bulundu:', product);
              editProduct(product);
            }
          });
        });
      }, 2000);
    }
  }, [user, router, products]);

  useEffect(() => {
    if (!token) {
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
        
        // LocalStorage'dan kayıtlı sıralamayı kontrol et
        const savedOrder = localStorage.getItem('categoryOrder');
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          const categories = categoriesResponse.data;
          
          // Kayıtlı sıralamaya göre kategorileri düzenle
          const reorderedCategories = orderIds.map((id: number) => 
            categories.find((cat: any) => cat.id === id)
          ).filter(Boolean);
          
          // Kayıtlı sıralamada olmayan kategorileri sona ekle
          const remainingCategories = categories.filter((cat: any) => 
            !orderIds.includes(cat.id)
          );
          
          setCategories([...reorderedCategories, ...remainingCategories]);
        } else {
          setCategories(categoriesResponse.data);
        }
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

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await axios.get(API_ENDPOINTS.COMPANIES, { headers: { Authorization: `Bearer ${token}` } });
        setCompanies(response.data);
      } catch (e) { /* hata yönetimi */ }
    }
    fetchCompanies();
  }, [token]);

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
        
        // Çok şiddetli ve yüksek melodili 3 saniye uyarı sesi
        const duration = 3.0; // 3 saniye
        const startTime = audioContext.currentTime;
        
        // Yüksek melodili ve dikkat çekici frekans değişimleri
        oscillator.frequency.setValueAtTime(1500, startTime); // Çok yüksek başlangıç
        oscillator.frequency.setValueAtTime(800, startTime + 0.3);
        oscillator.frequency.setValueAtTime(1800, startTime + 0.6);
        oscillator.frequency.setValueAtTime(600, startTime + 0.9);
        oscillator.frequency.setValueAtTime(2000, startTime + 1.2); // En yüksek frekans
        oscillator.frequency.setValueAtTime(400, startTime + 1.5);
        oscillator.frequency.setValueAtTime(1600, startTime + 1.8);
        oscillator.frequency.setValueAtTime(700, startTime + 2.1);
        oscillator.frequency.setValueAtTime(1900, startTime + 2.4);
        oscillator.frequency.setValueAtTime(500, startTime + 2.7);
        oscillator.frequency.setValueAtTime(1700, startTime + 3.0);
        
        // Çok yüksek ses seviyesi - şiddetli uyarı
        gainNode.gain.setValueAtTime(0.9, startTime); // Maksimum ses seviyesi
        gainNode.gain.setValueAtTime(0.9, startTime + 0.2);
        gainNode.gain.setValueAtTime(1.0, startTime + 0.5); // Tam ses
        gainNode.gain.setValueAtTime(1.0, startTime + 0.8);
        gainNode.gain.setValueAtTime(0.95, startTime + 1.1);
        gainNode.gain.setValueAtTime(1.0, startTime + 1.4);
        gainNode.gain.setValueAtTime(0.9, startTime + 1.7);
        gainNode.gain.setValueAtTime(1.0, startTime + 2.0);
        gainNode.gain.setValueAtTime(0.95, startTime + 2.3);
        gainNode.gain.setValueAtTime(0.9, startTime + 2.6);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
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
      console.log('📊 Siparişler yüklendi:', response.data);
      console.log('📊 Masa siparişleri:', response.data.filter((order: Order) => order.orderType === 'TABLE'));
      console.log('📊 Masa bilgisi olan siparişler:', response.data.filter((order: Order) => order.orderType === 'TABLE' && order.table));
      console.log('📊 Masa bilgisi olmayan siparişler:', response.data.filter((order: Order) => order.orderType === 'TABLE' && !order.table));
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
    
    const formData = {
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      categoryId: (product.categoryId || product.category?.id || '').toString(),
      branchId: (product.branchId || product.branch?.id || '').toString(),
      isActive: product.isActive
    };
    
    setEditProductForm(formData);
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

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryForm({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive
    });
    setShowEditCategoryModal(true);
  };

  const updateCategory = async () => {
    try {
      await axios.put(API_ENDPOINTS.ADMIN_UPDATE_CATEGORY(editingCategory!.id), editCategoryForm, {
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
  };

  // Kategori sıralama fonksiyonu
  const handleCategoryReorder = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(categories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Önce UI'ı güncelle
    setCategories(items);

    // LocalStorage'a kaydet
    localStorage.setItem('categoryOrder', JSON.stringify(items.map(cat => cat.id)));

    try {
      await axios.put(API_ENDPOINTS.ADMIN_REORDER_CATEGORIES, 
        { categories: items.map((cat, index) => ({ id: cat.id, sortOrder: index })) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Kategori sıralaması güncellendi');
    } catch (error: any) {
      toast.error(`Sıralama güncellenemedi: ${error.response?.data?.error || error.message}`);
      console.log('Sıralama hatası, localStorage\'dan geri yükleniyor...');
      
      // Hata durumunda localStorage'dan geri yükle
      const savedOrder = localStorage.getItem('categoryOrder');
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        const reorderedCategories = orderIds.map((id: number) => 
          categories.find(cat => cat.id === id)
        ).filter(Boolean);
        setCategories(reorderedCategories);
      }
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

  // Kullanıcı ekleme fonksiyonu
  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_USERS, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Kullanıcı başarıyla eklendi');
      setUsers([...users, response.data]);
      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'CUSTOMER', branchId: '' });
    } catch (error: any) {
      console.error('Kullanıcı ekleme hatası:', error);
      toast.error(error.response?.data?.error || 'Kullanıcı eklenirken hata oluştu');
    }
  };

  // Ürün ekleme fonksiyonu
  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price || !productForm.categoryId || !productForm.branchId) {
      toast.error('Tüm gerekli alanları doldurun ve şube seçin.');
      return;
    }
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
      
      const response = await axios.post(API_ENDPOINTS.ADMIN_PRODUCTS, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Ürün başarıyla eklendi');
      setProducts([...products, response.data]);
      setShowProductModal(false);
      setProductForm({ name: '', description: '', price: '', categoryId: '', branchId: '' });
      setProductImage(null);
    } catch (error: any) {
      console.error('Ürün ekleme hatası:', error);
      toast.error(error.response?.data?.error || 'Ürün eklenirken hata oluştu');
    }
  };

  // Kategori ekleme fonksiyonu
  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) {
      toast.error('Kategori adı zorunludur.');
      return;
    }
    const data = { ...categoryForm, companyId: 1 };
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_CATEGORIES, data, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Kategori başarıyla eklendi');
      setCategories([...categories, response.data]);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Kategori eklenirken hata oluştu');
    }
  };

  // Şube ekleme fonksiyonu
  const addBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name || !branchForm.address || !branchForm.phone) {
      toast.error('Tüm alanlar (isim, adres, telefon) zorunludur.');
      return;
    }
    const data = { ...branchForm, companyId: 1 };
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_BRANCHES, data, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Şube başarıyla eklendi');
      setBranches([...branches, response.data]);
      setShowBranchModal(false);
      setBranchForm({ name: '', address: '', phone: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Şube eklenirken hata oluştu');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  
      
      // Backend'den gelen veriyi frontend formatına dönüştür
      const formattedStats = [];
      
      



  

 

    

  useEffect(() => {
    if (activeTab !== 'daily-stats') return;
    setStatsLoading(true);

    axios.get(API_ENDPOINTS.ADMIN_STATS, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        period: statsPeriod,
        branchId: statsBranchId || undefined
      }
    })
      .then((response) => {
        // Backend'den gelen veriyi frontend formatına dönüştür
        const formattedStats = response.data.map((stat: any) => ({
          label: `${stat.branchName} - ${statsPeriod === 'daily' ? 'Günlük' : statsPeriod === 'weekly' ? 'Haftalık' : 'Aylık'} Gelir`,
          value: `₺${stat.revenue.toFixed(2)} (${stat.orders} sipariş)`
        }));
        setStats(formattedStats);
      })
      .catch((error) => {
        setStats([]);
        // Hata mesajı göster
      })
      .finally(() => setStatsLoading(false));
  }, [activeTab, statsPeriod, statsBranchId, token]);

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
            {(user && user.role === 'SUPER_ADMIN' || user && user.role === 'BRANCH_MANAGER') && (
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
            {(user && user.role === 'SUPER_ADMIN' || user && user.role === 'BRANCH_MANAGER') && (
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'tables' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Masa Yönetimi
              </button>
            )}
            <button
              onClick={() => {
                console.log('POS button clicked, navigating to /pos');
                router.push('/pos');
              }}
              className="px-8 py-4 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 text-xl shadow-xl border-4 border-green-500 transform hover:scale-105 transition-all duration-200 z-50 relative"
              style={{ 
                backgroundColor: '#16a34a', 
                borderColor: '#22c55e',
                boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)',
                position: 'relative',
                zIndex: 1000
              }}
            >
              🏪 KASA EKRANI
            </button>
          </div>

          {/* İçerik alanı */}
          <div className="bg-white rounded-lg shadow">
            {activeTab === 'orders' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Siparişler</h2>
                </div>
                <OrderList
                  orders={orders}
                  onUpdateStatus={updateOrderStatus}
                  getStatusColor={getStatusColor}
                  getStatusText={getStatusText}
                  formatDate={formatDate}
                />
              </div>
            )}
            
            {activeTab === 'users' && user && (user.role === 'SUPER_ADMIN' || user.role === 'BRANCH_MANAGER') && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Kullanıcılar</h2>
                  <button
                    onClick={() => setShowUserModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Yeni Kullanıcı Ekle
                  </button>
                </div>
                <UserList
                  users={sortedUsers}
                  onDeleteUser={deleteUser}
                  onActivateUser={activateUser}
                />
              </div>
            )}
            
            {activeTab === 'branches' && user && (user.role === 'SUPER_ADMIN' || user.role === 'BRANCH_MANAGER') && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Şubeler</h2>
                  <button
                    onClick={() => setShowBranchModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Yeni Şube Ekle
                  </button>
                </div>
                <BranchManagement
                  branches={branches}
                  onEditBranch={editBranch}
                  onDeleteBranch={deleteBranch}
                />
              </div>
            )}
            
            {activeTab === 'products' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Ürünler</h2>
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Yeni Ürün Ekle
                  </button>
                </div>
                <ProductManagement
                  products={products}
                  categories={categories}
                  branches={branches}
                  onEditProduct={editProduct}
                  onDeleteProduct={deleteProduct}
                  onToggleProductStatus={toggleProductStatus}
                  user={user}
                />
              </div>
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
                <div className="bg-white rounded-lg shadow">
                  <DragDropContext onDragEnd={handleCategoryReorder}>
                    <Droppable droppableId="categories">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="divide-y divide-gray-200"
                        >
                          {categories.map((category, index) => (
                            <Draggable key={category.id} draggableId={category.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-4 flex items-center justify-between ${
                                    snapshot.isDragging ? 'bg-blue-50 shadow-lg' : 'bg-white'
                                  }`}
                                >
                                  <div className="flex items-center space-x-4">
                                    <div className="text-gray-400 cursor-move">
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                      <div className="text-sm text-gray-500">{category.description}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {category.isActive ? 'Aktif' : 'Pasif'}
                                    </span>
                                    <button
                                      onClick={() => editCategory(category)}
                                      className="text-blue-600 hover:text-blue-900 text-sm"
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      onClick={() => deleteCategory(category.id)}
                                      className="text-red-600 hover:text-red-900 text-sm"
                                    >
                                      Sil
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  💡 Kategorileri sürükleyip bırakarak sıralayabilirsiniz. Bu sıralama ana sayfada da geçerli olacaktır.
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
                    {(user && user.role === 'SUPER_ADMIN' || user && user.role === 'BRANCH_MANAGER') && (
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
                              order.status !== 'COMPLETED'
                            ).length}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Toplam Gelir:</span>
                          <span className="font-medium text-blue-600">
                            ₺{orders
                              .filter(order => 
                                order.branch.id === branch.id && 
                                order.orderType === 'TABLE'
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
                          .filter(order => order.orderType === 'TABLE')
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
            
            {activeTab === 'tables' && user && (user.role === 'SUPER_ADMIN' || user.role === 'BRANCH_MANAGER') && (
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

      {/* Kullanıcı Ekleme Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Yeni Kullanıcı Ekle</h2>
            <form onSubmit={addUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="CUSTOMER">Müşteri</option>
                    <option value="BRANCH_MANAGER">Şube Müdürü</option>
                    <option value="SUPER_ADMIN">Süper Admin</option>
                  </select>
                </div>
                {(userForm.role === 'BRANCH_MANAGER' || (user && user.role === 'BRANCH_MANAGER')) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Şube
                    </label>
                    <select
                      value={userForm.branchId}
                      onChange={(e) => setUserForm({...userForm, branchId: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Şube Seçin</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Ekleme Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Yeni Ürün Ekle</h2>
            <form onSubmit={addProduct}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Adı
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiyat (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({...productForm, categoryId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                {(user && user.role === 'SUPER_ADMIN' || user && user.role === 'BRANCH_MANAGER') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Şube
                    </label>
                    <select
                      value={productForm.branchId}
                      onChange={(e) => setProductForm({...productForm, branchId: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Şube Seçin</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Resmi
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kategori Ekleme Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Yeni Kategori Ekle</h2>
            <form onSubmit={addCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori Adı
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ürün Düzenleme Modal */}
      {(() => {
        console.log('🔧 Modal render kontrolü:');
        console.log('🔧 showEditProductModal:', showEditProductModal);
        console.log('🔧 editingProduct:', editingProduct);
        console.log('🔧 Modal koşulu:', showEditProductModal && editingProduct);
        
        try {
          return showEditProductModal && editingProduct;
        } catch (error) {
          console.error('❌ Modal render hatası:', error);
          return false;
        }
      })() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-modal="edit-product">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Ürün Düzenle</h2>
            <form onSubmit={(e) => { e.preventDefault(); updateProduct(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Adı
                  </label>
                  <input
                    type="text"
                    value={editProductForm.name}
                    onChange={(e) => setEditProductForm({...editProductForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                    disabled={user?.role === 'BRANCH_MANAGER'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={editProductForm.description}
                    onChange={(e) => setEditProductForm({...editProductForm, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    disabled={user?.role === 'BRANCH_MANAGER'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiyat (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editProductForm.price}
                    onChange={(e) => setEditProductForm({...editProductForm, price: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                    disabled={user?.role === 'BRANCH_MANAGER'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editProductForm.categoryId}
                    onChange={(e) => setEditProductForm({...editProductForm, categoryId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                    disabled={user?.role === 'BRANCH_MANAGER'}
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                {(user && user.role === 'SUPER_ADMIN') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Şube
                    </label>
                    <select
                      value={editProductForm.branchId}
                      onChange={(e) => setEditProductForm({...editProductForm, branchId: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Şube Seçin</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <select
                    value={Boolean(editProductForm.isActive) ? 'true' : 'false'}
                    onChange={(e) => setEditProductForm({...editProductForm, isActive: e.target.value === 'true'})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Resmi
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditProductImage(e.target.files?.[0] || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    disabled={user?.role === 'BRANCH_MANAGER'}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProductModal(false);
                    setEditingProduct(null);
                    setEditProductImage(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kategori Düzenleme Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Kategori Düzenle</h2>
            <form onSubmit={(e) => { e.preventDefault(); updateCategory(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori Adı
                  </label>
                  <input
                    type="text"
                    value={editCategoryForm.name}
                    onChange={(e) => setEditCategoryForm({...editCategoryForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={editCategoryForm.description}
                    onChange={(e) => setEditCategoryForm({...editCategoryForm, description: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <select
                    value={Boolean(editCategoryForm.isActive) ? 'true' : 'false'}
                    onChange={(e) => setEditCategoryForm({...editCategoryForm, isActive: e.target.value === 'true'})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Şube Düzenleme Modal */}
      {showEditBranchModal && editingBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Şube Düzenle</h2>
            <form onSubmit={(e) => { e.preventDefault(); updateBranch(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şube Adı
                  </label>
                  <input
                    type="text"
                    value={editBranchForm.name}
                    onChange={(e) => setEditBranchForm({...editBranchForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <textarea
                    value={editBranchForm.address}
                    onChange={(e) => setEditBranchForm({...editBranchForm, address: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={editBranchForm.phone}
                    onChange={(e) => setEditBranchForm({...editBranchForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <select
                    value={Boolean(editBranchForm.isActive) ? 'true' : 'false'}
                    onChange={(e) => setEditBranchForm({...editBranchForm, isActive: e.target.value === 'true'})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBranchModal(false);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Şube Ekleme Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Yeni Şube Ekle</h2>
            <form onSubmit={addBranch}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şube Adı
                  </label>
                  <input
                    type="text"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({...branchForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <textarea
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({...branchForm, address: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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