// API Configuration - Local development için local backend kullan
export const getApiBaseUrl = (): string => {
  // Development ortamında local backend kullan
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  
  // Production'da canlı backend kullan
  // Eğer window.location.hostname arsut.net.tr ise, production backend kullan
  if (typeof window !== 'undefined' && window.location.hostname === 'arsut.net.tr') {
    return 'https://yemek5-backend.onrender.com';
  }
  
  // Diğer production ortamları için
  return process.env.NEXT_PUBLIC_API_URL || 'https://yemek5-backend.onrender.com';
};

// API_BASE_URL'yi dinamik olarak al
const getCurrentApiBaseUrl = () => getApiBaseUrl();
console.log('🔧 API Base URL:', getCurrentApiBaseUrl());
console.log('🔧 Window location:', typeof window !== 'undefined' ? window.location.hostname : 'SSR');

// API isteği wrapper'ı - Geliştirilmiş hata yönetimi
const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    console.log('🔍 API isteği başlatılıyor:', url);
    console.log('🔍 Request options:', options);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('📡 API yanıtı alındı:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API hatası:', response.status, errorText);
      
      // Detaylı hata mesajı
      const errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`;
      console.error('❌ Hata detayı:', errorMessage);
      
      // 404 hatası için özel mesaj
      if (response.status === 404) {
        throw new Error(`Endpoint bulunamadı: ${url}. Backend çalışıyor mu?`);
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ API verisi başarıyla alındı:', data);
    return data;
  } catch (error) {
    console.error('❌ API isteği hatası:', error);
    
    // Network hatası için özel mesaj
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ Network hatası - Backend çalışmıyor olabilir');
      throw new Error('Backend sunucusuna bağlanılamıyor. Lütfen backend\'in çalıştığından emin olun.');
    }
    
    throw error;
  }
};

// Base64 encoded placeholder image
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlNWU3ZWIiIHN0cm9rZT0iI2QxZDU5YiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iMjAwIiBjeT0iMTUwIiByPSI0MCIgZmlsbD0iIzljYTNhZiIvPgogIDxwYXRoIGQ9Ik0xODAgMTMwIEwyMjAgMTUwIEwxODAgMTcwIFoiIGZpbGw9IiM2YjcyODAiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNmI3MjgwIj5SZXNpbSBZb2s8L3RleHQ+Cjwvc3ZnPgo=';

// Resim yükleme hatası için handler
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const img = event.currentTarget;
  
  // Base64 resimler için hata kontrolü yapma
  if (img.src.startsWith('data:image/')) {
    console.log('Base64 resim yüklenemedi, placeholder gösteriliyor:', img.src.substring(0, 50) + '...');
    img.src = PLACEHOLDER_IMAGE;
    img.onerror = null; // Sonsuz döngüyü önle
    return;
  }
  
  // Eğer zaten placeholder gösteriliyorsa, sonsuz döngüyü önle
  if (img.src.includes('data:image/svg+xml') || img.src.includes('placeholder-image.svg')) {
    console.log('Placeholder zaten gösteriliyor, döngü önlendi');
    return;
  }
  
  console.log('Resim yüklenemedi, placeholder gösteriliyor:', img.src);
  img.src = PLACEHOLDER_IMAGE;
  img.onerror = null; // Sonsuz döngüyü önle
};

export const API_ENDPOINTS = {
  // Auth
  get REGISTER() { return `${getCurrentApiBaseUrl()}/api/auth/register` },
  get LOGIN() { return `${getCurrentApiBaseUrl()}/api/auth/login` },
  
  // Branches
  get BRANCHES() { 
    const url = `${getCurrentApiBaseUrl()}/api/branches`;
    console.log('🔍 BRANCHES endpoint:', url);
    return url;
  },
  
  // Products - Debug log'ları eklendi
  get PRODUCTS() { 
    return (branchId: number) => {
      const url = `${getCurrentApiBaseUrl()}/api/products/${branchId}`;
      console.log('🔍 PRODUCTS endpoint:', url, 'for branchId:', branchId);
      return url;
    };
  },
  
  // QR Menu - Debug log'ları eklendi
  get QR_MENU() {
    return (branchId: number) => {
      const url = `${getCurrentApiBaseUrl()}/api/qr-menu/${branchId}`;
      console.log('🔍 QR_MENU endpoint:', url, 'for branchId:', branchId);
      return url;
    };
  },
  
  // Categories
  get CATEGORIES() { return `${getCurrentApiBaseUrl()}/api/categories` },
  
  // Orders
  get ORDERS() { return `${getCurrentApiBaseUrl()}/api/orders` },
  get ORDER_DETAIL() { return (orderId: number) => `${getCurrentApiBaseUrl()}/api/orders/${orderId}` },
  
  // Customer
  get CUSTOMER_PROFILE() { return `${getCurrentApiBaseUrl()}/api/customer/profile` },
  
  // Image Management
  get UPLOAD_IMAGE() { return `${getCurrentApiBaseUrl()}/api/admin/upload-image` },
  get GET_IMAGES() { return `${getCurrentApiBaseUrl()}/api/admin/images-public` }, // Public endpoint kullan
  get DELETE_IMAGE() { return (filename: string) => `${getCurrentApiBaseUrl()}/api/admin/images/${filename}` },
  get CUSTOMER_ORDERS() { return `${getCurrentApiBaseUrl()}/api/customer/orders` },
  get CUSTOMER_ORDER_DETAIL() { return (orderId: number) => `${getCurrentApiBaseUrl()}/api/customer/orders/${orderId}` },
  get CUSTOMER_ADDRESSES() { return `${getCurrentApiBaseUrl()}/api/customer/addresses` },
  get CUSTOMER_ADD_ADDRESS() { return `${getCurrentApiBaseUrl()}/api/customer/addresses` },
  get CUSTOMER_UPDATE_ADDRESS() { return (addressId: number) => `${getCurrentApiBaseUrl()}/api/customer/addresses/${addressId}` },
  get CUSTOMER_DELETE_ADDRESS() { return (addressId: number) => `${getCurrentApiBaseUrl()}/api/customer/addresses/${addressId}` },
  
  // Admin
  get ADMIN_ORDERS() { return `${getCurrentApiBaseUrl()}/api/admin/orders` },
  get ADMIN_USERS() { return `${getCurrentApiBaseUrl()}/api/admin/users` },
  get ADMIN_PRODUCTS() { return `${getCurrentApiBaseUrl()}/api/admin/products` },
  get ADMIN_CATEGORIES() { return `${getCurrentApiBaseUrl()}/api/admin/categories` },
  get ADMIN_STATS() { return `${getCurrentApiBaseUrl()}/api/admin/stats` },
  get ADMIN_UPDATE_ORDER_STATUS() { return (orderId: number) => `${getCurrentApiBaseUrl()}/api/admin/orders/${orderId}/status` },
  get ADMIN_DELETE_USER() { return (userId: number) => `${getCurrentApiBaseUrl()}/api/admin/users/${userId}` },
  get ADMIN_ACTIVATE_USER() { return (userId: number) => `${getCurrentApiBaseUrl()}/api/admin/users/${userId}/activate` },
  get ADMIN_DELETE_PRODUCT() { return (productId: number) => `${getCurrentApiBaseUrl()}/api/admin/products/${productId}` },
  get ADMIN_UPDATE_PRODUCT() { return (productId: number) => `${getCurrentApiBaseUrl()}/api/admin/products/${productId}` },
  get ADMIN_DELETE_CATEGORY() { return (categoryId: number) => `${getCurrentApiBaseUrl()}/api/admin/categories/${categoryId}` },
  get ADMIN_UPDATE_CATEGORY() { return (categoryId: number) => `${getCurrentApiBaseUrl()}/api/admin/categories/${categoryId}` },
  get ADMIN_REORDER_CATEGORIES() { return `${getCurrentApiBaseUrl()}/api/admin/categories/reorder` },
  get ADMIN_BRANCHES() { return `${getCurrentApiBaseUrl()}/api/branches` },
  get ADMIN_UPDATE_BRANCH() { return (branchId: number) => `${getCurrentApiBaseUrl()}/api/admin/branches/${branchId}` },
  get ADMIN_DELETE_BRANCH() { return (branchId: number) => `${getCurrentApiBaseUrl()}/api/admin/branches/${branchId}` },
  get ADMIN_DEACTIVATE_BRANCH() { return (branchId: number) => `${getCurrentApiBaseUrl()}/api/admin/branches/${branchId}/deactivate` },
  get ADMIN_CLEANUP_IMAGES() { return `${getCurrentApiBaseUrl()}/api/admin/cleanup-images` },
  get ADMIN_IMAGE_STATUS() { return `${getCurrentApiBaseUrl()}/api/admin/image-status` },
  
  // Database Cleanup
  get ADMIN_CLEANUP_ORDERS() { return `${getCurrentApiBaseUrl()}/api/admin/cleanup-orders` },
  get ADMIN_DELETE_ALL_ORDERS() { return `${getCurrentApiBaseUrl()}/api/admin/orders` },
  get ADMIN_DATABASE_STATS() { return `${getCurrentApiBaseUrl()}/api/admin/database-stats` },
  get ADMIN_IMAGES() { return `${getCurrentApiBaseUrl()}/api/admin/images` },
  get ADMIN_UPLOAD_IMAGES() { return `${getCurrentApiBaseUrl()}/api/admin/upload-images` },
  get ADMIN_DELETE_IMAGE() { return (imageId: string) => `${getCurrentApiBaseUrl()}/api/admin/images/${imageId}` },
  get SYNC_IMAGES() { return `${getCurrentApiBaseUrl()}/api/admin/sync-images` },
  
  // Table Management
  get ADMIN_TABLES() { return `${getCurrentApiBaseUrl()}/api/admin/tables` },
  get ADMIN_TABLES_BY_BRANCH() { return (branchId: number) => `${getCurrentApiBaseUrl()}/api/admin/tables/branch/${branchId}` },
  get ADMIN_TABLE_QR() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/admin/tables/${tableId}/qr` },
  get ADMIN_UPDATE_TABLE() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/admin/tables/${tableId}` },
  get ADMIN_DELETE_TABLE() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/admin/tables/${tableId}` },
  
  // Table Orders & Collection
  get ADMIN_TABLE_ORDERS() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/admin/tables/${tableId}/orders` },
  get TABLE_ORDERS() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/table/${tableId}/orders` },
  get ADMIN_TABLE_COLLECT() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/admin/tables/${tableId}/collect` },
  get ADMIN_TABLE_RESET() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/admin/tables/${tableId}/reset` },
  get ADMIN_ACTIVE_TABLES() { return `${getCurrentApiBaseUrl()}/api/admin/tables/active` },
  
  // Table Order
  get TABLE_INFO() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/table/${tableId}` },
  get TABLE_PRODUCTS() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/table/${tableId}/products` },
  get TABLE_ORDER() { return (tableId: number) => `${getCurrentApiBaseUrl()}/api/table/${tableId}/order` },
  
  // Images
  get IMAGE_URL() { 
    return (imagePath: string) => {
      // Eğer imagePath yoksa veya boşsa, placeholder resim döndür
      if (!imagePath || imagePath.trim() === '') {
        return PLACEHOLDER_IMAGE;
      }
      
      // Eğer imagePath zaten tam URL ise (Cloudinary URL), olduğu gibi döndür
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      
      // Base64 data URL kontrolü - doğrudan döndür
      if (imagePath.startsWith('data:image/')) {
        return imagePath;
      }
      
      // /uploads/products/ formatındaki resimler için
      if (imagePath.startsWith('/uploads/products/')) {
        const filename = imagePath.replace('/uploads/products/', '');
        return `${getCurrentApiBaseUrl()}/api/images/${filename}`;
      }
      
      // Eğer imagePath sadece dosya adı ise (örn: "resim.png"), proxy endpoint kullan
      if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
        return `${getCurrentApiBaseUrl()}/api/images/${imagePath}`;
      }
      
      // Normal resim URL'si oluştur
      return `${getCurrentApiBaseUrl()}${imagePath}`;
    };
  },
  
  get COMPANIES() { return `${getCurrentApiBaseUrl()}/api/companies` },
  get CUSTOMERS() { return `${getCurrentApiBaseUrl()}/api/customers` },
  
  // Backup Management
  get ADMIN_BACKUP_STATS() { return `${getCurrentApiBaseUrl()}/api/admin/backup/stats` },
  get ADMIN_BACKUP_LIST() { return `${getCurrentApiBaseUrl()}/api/admin/backup/list` },
  get ADMIN_BACKUP_CREATE() { return `${getCurrentApiBaseUrl()}/api/admin/backup/create` },
  get ADMIN_BACKUP_DOWNLOAD() { return (filename: string) => `${getCurrentApiBaseUrl()}/api/admin/backup/download/${filename}` },
};

export { apiRequest };
export default API_ENDPOINTS; 