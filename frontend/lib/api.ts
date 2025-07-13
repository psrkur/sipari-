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
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
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
  
  // Admin
  ADMIN_ORDERS: `${API_BASE_URL}/api/admin/orders`,
  ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
  ADMIN_PRODUCTS: `${API_BASE_URL}/api/admin/products`,
  ADMIN_CATEGORIES: `${API_BASE_URL}/api/admin/categories`,
  ADMIN_STATS: `${API_BASE_URL}/api/admin/stats`,
  ADMIN_UPDATE_ORDER_STATUS: (orderId: number) => `${API_BASE_URL}/api/admin/orders/${orderId}/status`,
  ADMIN_DELETE_USER: (userId: number) => `${API_BASE_URL}/api/admin/users/${userId}`,
  ADMIN_DELETE_PRODUCT: (productId: number) => `${API_BASE_URL}/api/admin/products/${productId}`,
  ADMIN_UPDATE_PRODUCT: (productId: number) => `${API_BASE_URL}/api/admin/products/${productId}`,
  ADMIN_DELETE_CATEGORY: (categoryId: number) => `${API_BASE_URL}/api/categories/${categoryId}`,
  ADMIN_UPDATE_CATEGORY: (categoryId: number) => `${API_BASE_URL}/api/admin/categories/${categoryId}`,
  ADMIN_UPDATE_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/branches/${branchId}`,
  ADMIN_DELETE_BRANCH: (branchId: number) => `${API_BASE_URL}/api/admin/branches/${branchId}`,
  
  // Images
  IMAGE_URL: (imagePath: string) => `${API_BASE_URL}${imagePath}`,
};

export { apiRequest };
export default API_ENDPOINTS; 