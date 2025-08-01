import axios from 'axios'
import { getApiBaseUrl } from './api'

// Axios instance oluştur
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000, // 10 saniye timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('🔍 Axios request:', config.method?.toUpperCase(), config.url)
    
    // JWT token'ı auth store'dan veya localStorage'dan al
    let token = null;
    
    // Önce auth store'dan token'ı almaya çalış
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token;
        console.log('🔍 Auth storage token:', token ? 'Bulundu' : 'Bulunamadı');
      }
    } catch (error) {
      console.error('Auth storage parse error:', error);
    }
    
    // Eğer auth store'dan alınamadıysa localStorage'dan al
    if (!token) {
      token = localStorage.getItem('token');
      console.log('🔍 LocalStorage token:', token ? 'Bulundu' : 'Bulunamadı');
    }
    
    // Zustand store'dan da kontrol et
    if (!token) {
      try {
        // Zustand store'u doğrudan kontrol et
        const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}');
        if (authStore.state && authStore.state.token) {
          token = authStore.state.token;
          console.log('🔍 Zustand store token bulundu');
        }
      } catch (error) {
        console.error('Zustand store parse error:', error);
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token eklendi:', token.substring(0, 20) + '...');
    } else {
      console.log('⚠️ Token bulunamadı - Tüm kaynaklar kontrol edildi');
    }
    
    return config
  },
  (error) => {
    console.error('❌ Axios request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Axios response:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('❌ Axios response error:', error)
    
    if (error.code === 'ERR_NETWORK') {
      console.error('🌐 Network error - Backend çalışmıyor olabilir')
    }
    
    if (error.response) {
      console.error('📊 Error response:', error.response.status, error.response.data)
    }
    
    return Promise.reject(error)
  }
)

export default apiClient 