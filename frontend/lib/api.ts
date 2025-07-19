// API Configuration - Otomatik bağlantı
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }
  
  return 'https://yemek5-backend.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

// API isteği wrapper'ı
const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    console.log('API isteği:', url, options);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('API yanıtı:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API hatası:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API verisi:', data);
    return data;
  } catch (error) {
    console.error('API isteği hatası:', error);
    throw error;
  }
};

// Base64 encoded placeholder image
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlNWU3ZWIiIHN0cm9rZT0iI2QxZDU5YiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPGNpcmNsZSBjeD0iMjAwIiBjeT0iMTUwIiByPSI0MCIgZmlsbD0iIzljYTNhZiIvPgogIDxwYXRoIGQ9Ik0xODAgMTMwIEwyMjAgMTUwIEwxODAgMTcwIFoiIGZpbGw9IiM2YjcyODAiLz4KICA8dGV4dCB4PSIyMDAiIHk9IjIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNmI3MjgwIj5SZXNpbSBZb2s8L3RleHQ+Cjwvc3ZnPgo=';

// Resim yükleme hatası için handler
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const img = event.currentTarget;
  console.log('Resim yüklenemedi, placeholder gösteriliyor:', img.src);
  
  // Eğer zaten placeholder gösteriliyorsa, sonsuz döngüyü önle
  if (img.src.includes('data:image/svg+xml') || img.src.includes('placeholder-image.svg')) {
    console.log('Placeholder zaten gösteriliyor, döngü önlendi');
    return;
  }
  
  img.src = PLACEHOLDER_IMAGE;
  img.onerror = null; // Sonsuz döngüyü önle
};

export const API_ENDPOINTS = {
  // Auth
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  
  // Branches
  BRANCHES: `${API_BASE_URL}/api/branches`,
  
  // Products
  PRODUCTS: (branchId: number) => `${API_BASE_URL}/api/products/${branchId}`,
  
  // Orders
  ORDERS: `${API_BASE_URL}/api/orders`,
  
  // Customer
  CUSTOMER_PROFILE: `${API_BASE_URL}/api/customer/profile`,
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
  ADMIN_BRANCHES: `${API_BASE_URL}/api/admin/branches`,
  ADMIN_UPDATE_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/branches/${branchId}`,
  ADMIN_DELETE_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/branches/${branchId}`,
  ADMIN_CLEANUP_IMAGES: `${API_BASE_URL}/api/admin/cleanup-images`,
  ADMIN_IMAGE_STATUS: `${API_BASE_URL}/api/admin/image-status`,
  
  // Table Management
  ADMIN_TABLES: `${API_BASE_URL}/api/admin/tables`,
  ADMIN_TABLES_BY_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/tables/${branchId}`,
  ADMIN_TABLE_QR: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/qr`,
  ADMIN_UPDATE_TABLE: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}`,
  ADMIN_DELETE_TABLE: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}`,
  
  // Table Orders & Collection
  ADMIN_TABLE_ORDERS: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/orders`,
  ADMIN_TABLE_COLLECT: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/collect`,
  ADMIN_TABLE_RESET: (tableId: number) => `${API_BASE_URL}/api/admin/tables/${tableId}/reset`,
  
  // Table Order
  TABLE_INFO: (tableId: number) => `${API_BASE_URL}/api/table/${tableId}`,
  TABLE_PRODUCTS: (tableId: number) => `${API_BASE_URL}/api/table/${tableId}/products`,
  TABLE_ORDER: (tableId: number) => `${API_BASE_URL}/api/table/${tableId}/order`,
  
  // Images
  IMAGE_URL: (imagePath: string) => {
    // Eğer imagePath zaten tam URL ise, olduğu gibi döndür
    if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
      return imagePath;
    }
    
    // Eğer imagePath yoksa veya boşsa, placeholder resim döndür
    if (!imagePath || imagePath.trim() === '') {
      return PLACEHOLDER_IMAGE;
    }
    
    // Normal resim URL'si oluştur
    return `${API_BASE_URL}${imagePath}`;
  },
};

export { apiRequest };
export default API_ENDPOINTS; 