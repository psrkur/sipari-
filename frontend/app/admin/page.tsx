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
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'products' | 'categories' | 'branches' | 'daily-stats' | 'tables'>('orders');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsBranchId, setStatsBranchId] = useState('');
  const [statsPeriod, setStatsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  // Yazıcı seçimi için state
  const [printerName, setPrinterName] = useState<string>(typeof window !== 'undefined' ? localStorage.getItem('printerName') || '' : '');
  const [printers, setPrinters] = useState<{name: string}[]>([]);

  // Electron ortamında yazıcıları çek
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getPrinters) {
      (window as any).electronAPI.getPrinters().then((printerList: any[]) => {
        setPrinters(printerList);
      });
    }
  }, []);

  // Yazıcı adı değiştiğinde localStorage'a kaydet
  const handlePrinterNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrinterName(e.target.value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('printerName', e.target.value);
    }
  };

  // Sipariş yazdırma fonksiyonu (web için window.print ile temel örnek)
  const printOrder = (order: Order) => {
    // Sipariş detaylarını yazdırılabilir bir formata çevir
    const printWindow = window.open('', '', 'width=600,height=800');
    if (!printWindow) return;
    printWindow.document.write('<html><head><title>Sipariş Fişi</title></head><body>');
    printWindow.document.write('<h2>Sipariş Fişi</h2>');
    printWindow.document.write(`<p><b>Sipariş No:</b> ${order.orderNumber}</p>`);
    printWindow.document.write(`<p><b>Tarih:</b> ${new Date(order.createdAt).toLocaleString('tr-TR')}</p>`);
    printWindow.document.write('<hr/>');
    printWindow.document.write('<ul>');
    order.items.forEach(item => {
      printWindow.document.write(`<li>${item.quantity} x ${item.product.name} - ${item.price}₺</li>`);
    });
    printWindow.document.write('</ul>');
    printWindow.document.write(`<p><b>Toplam:</b> ${order.totalAmount}₺</p>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

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
        
        try {
          const productsResponse = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          setProducts(productsResponse.data);
        } catch (error: any) {
          console.error('Products fetch error:', error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
            router.push('/login');
            return;
          }
          setProducts([]);
        }
      } else if (user && user.role === 'BRANCH_MANAGER') {
        try {
          const productsResponse = await axios.get(API_ENDPOINTS.ADMIN_PRODUCTS, { 
            headers: { Authorization: `Bearer ${token}` },
            params: { branchId: user.branchId }
          });
          setProducts(productsResponse.data);
        } catch (error: any) {
          console.error('Products fetch error:', error);
          if (error.response?.status === 401 || error.response?.status === 403) {
            toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
            router.push('/login');
            return;
          }
          setProducts([]);
        }
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
      // Otomatik yazdırma
      const newOrders = orders.slice(0, orders.length - lastOrderCount);
      // Sadece en son gelen siparişi yazdır (veya istenirse tüm yeni siparişleri döngüyle yazdır)
      if (orders.length > 0) {
        printOrder(orders[0]);
      }
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
        formData.append('isActive', editProductForm.isActive.toString());
      } else {
        // Süper admin tüm alanları güncelleyebilir
        formData.append('name', editProductForm.name);
        formData.append('description', editProductForm.description);
        formData.append('price', Number(editProductForm.price).toString());
        formData.append('categoryId', Number(editProductForm.categoryId).toString());
        formData.append('branchId', Number(editProductForm.branchId).toString());
        formData.append('isActive', editProductForm.isActive.toString());
        
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
      <div className="container mx-auto px-2 sm:px-4 md:px-8" style={{ maxWidth: 1200 }}>
        {/* Yazıcı seçme menüsü ve üst menü */}
        <div className="flex flex-col md:flex-row gap-2 items-center justify-between mb-4">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <label className="font-medium">Yazıcı Adı:</label>
            <select
              value={printerName}
              onChange={handlePrinterNameChange}
              className="border px-2 py-2 rounded w-full md:w-auto text-base"
              style={{ minWidth: 180 }}
            >
              <option value="">Yazıcı seçiniz</option>
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>{printer.name}</option>
              ))}
            </select>
          </div>
          {/* Diğer üst menü elemanları buraya */}
        </div>
        {/* Tab/menü alanı */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {/* Tablar veya menü butonları burada */}
        </div>
        {/* İçerik alanı */}
        <div className="overflow-x-auto">
          {/* Tabloları veya gridleri buraya koyun */}
          {/* Örnek: <OrderList ... /> veya <table> ... */}
        </div>
        {/* Diğer içerikler */}
      </div>
    </div>
  );
}