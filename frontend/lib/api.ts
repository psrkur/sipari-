// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://yemek5-backend.onrender.com' || 'http://localhost:3001';

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
  
  // Images
  IMAGE_URL: (imagePath: string) => `${API_BASE_URL}${imagePath}`,
};

export default API_ENDPOINTS; 