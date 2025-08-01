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