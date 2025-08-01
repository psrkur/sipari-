// API Configuration - Local development için local backend kullan
export const getApiBaseUrl = (): string => {
  // Development ortamında local backend kullan
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';
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
  get BRANCHES() { return `${getCurrentApiBaseUrl()}/api/branches` },
  
  // Products
  PRODUCTS: (branchId: number) => `${API_BASE_URL}/api/products/${branchId}`,
  
  // Categories
  CATEGORIES: `${API_BASE_URL}/api/categories`,
  
  // Orders
  ORDERS: `${API_BASE_URL}/api/orders`,
  ORDER_DETAIL: (orderId: number) => `${API_BASE_URL}/api/orders/${orderId}`,
  
  // Customer
  CUSTOMER_PROFILE: `${API_BASE_URL}/api/customer/profile`,
  
  // Image Management
  UPLOAD_IMAGE: `${API_BASE_URL}/api/admin/upload-image`,
  GET_IMAGES: `${API_BASE_URL}/api/admin/images-public`, // Public endpoint kullan
  DELETE_IMAGE: (filename: string) => `${API_BASE_URL}/api/admin/images/${filename}`,
  CUSTOMER_ORDERS: `${API_BASE_URL}/api/customer/orders`,
  CUSTOMER_ORDER_DETAIL: (orderId: number) => `${API_BASE_URL}/api/customer/orders/${orderId}`,
  CUSTOMER_ADDRESSES: `${API_BASE_URL}/api/customer/addresses`,
  CUSTOMER_ADD_ADDRESS: `${API_BASE_URL}/api/customer/addresses`,
  CUSTOMER_UPDATE_ADDRESS: (addressId: number) => `${API_BASE_URL}/api/customer/addresses/${addressId}`,
  CUSTOMER_DELETE_ADDRESS: (addressId: number) => `${API_BASE_URL}/api/customer/addresses/${addressId}`,
  
  // Admin
  ADMIN_ORDERS: `${API_BASE_URL}/api/admin/orders`,
  ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
  ADMIN_PRODUCTS: `${API_BASE_URL}/api/admin/products`,
  ADMIN_CATEGORIES: `${API_BASE_URL}/api/admin/categories`,
  ADMIN_STATS: `${API_BASE_URL}/api/admin/stats`,
  ADMIN_UPDATE_ORDER_STATUS: (orderId: number) => `${API_BASE_URL}/api/admin/orders/${orderId}/status`,
  ADMIN_DELETE_USER: (userId: number) => `${API_BASE_URL}/api/admin/users/${userId}`,
  ADMIN_ACTIVATE_USER: (userId: number) => `${API_BASE_URL}/api/admin/users/${userId}/activate`,
  ADMIN_DELETE_PRODUCT: (productId: number) => `${API_BASE_URL}/api/admin/products/${productId}`,
  ADMIN_UPDATE_PRODUCT: (productId: number) => `${API_BASE_URL}/api/admin/products/${productId}`,
  ADMIN_DELETE_CATEGORY: (categoryId: number) => `${API_BASE_URL}/api/admin/categories/${categoryId}`,
  ADMIN_UPDATE_CATEGORY: (categoryId: number) => `${API_BASE_URL}/api/admin/categories/${categoryId}`,
  ADMIN_REORDER_CATEGORIES: `${API_BASE_URL}/api/admin/categories/reorder`,
  ADMIN_BRANCHES: `${API_BASE_URL}/api/branches`,
  ADMIN_UPDATE_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/branches/${branchId}`,
  ADMIN_DELETE_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/branches/${branchId}`,
  ADMIN_CLEANUP_IMAGES: `${API_BASE_URL}/api/admin/cleanup-images`,
  ADMIN_IMAGE_STATUS: `${API_BASE_URL}/api/admin/image-status`,
  
  // Database Cleanup
  ADMIN_CLEANUP_ORDERS: `${API_BASE_URL}/api/admin/cleanup-orders`,
  ADMIN_DATABASE_STATS: `${API_BASE_URL}/api/admin/database-stats`,
  
  // Table Management
  ADMIN_TABLES: `${API_BASE_URL}/api/admin/tables`,
  ADMIN_TABLES_BY_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/tables/branch/${branchId}`,
  ADMIN_TABLE_QR: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/qr`,
  ADMIN_UPDATE_TABLE: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}`,
  ADMIN_DELETE_TABLE: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}`,
  
  // Table Orders & Collection
  ADMIN_TABLE_ORDERS: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/orders`,
  TABLE_ORDERS: (tableId: number) => `${API_BASE_URL}/api/table/${tableId}/orders`,
  ADMIN_TABLE_COLLECT: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/collect`,
  ADMIN_TABLE_RESET: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/reset`,
  ADMIN_ACTIVE_TABLES: `${API_BASE_URL}/api/admin/tables/active`,
  
  // Table Order
  TABLE_INFO: (tableId: number) => `${API_BASE_URL}/api/table/${tableId}`,
  TABLE_PRODUCTS: (tableId: number) => `${API_BASE_URL}/api/table/${tableId}/products`,
  TABLE_ORDER: (tableId: number) => `${API_BASE_URL}/api/table/${tableId}/order`,
  
  // Images
  IMAGE_URL: (imagePath: string) => {
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
      return `${API_BASE_URL}/api/images/${filename}`;
    }
    
    // Eğer imagePath sadece dosya adı ise (örn: "resim.png"), proxy endpoint kullan
    if (imagePath && !imagePath.startsWith('/') && !imagePath.startsWith('http')) {
      return `${API_BASE_URL}/api/images/${imagePath}`;
    }
    
    // Normal resim URL'si oluştur
    return `${API_BASE_URL}${imagePath}`;
  },
  
  COMPANIES: `${API_BASE_URL}/api/companies`,
  CUSTOMERS: `${API_BASE_URL}/api/customers`,
  

};

export { apiRequest };
export default API_ENDPOINTS; 