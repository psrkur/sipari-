'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { API_ENDPOINTS } from '../../lib/api'
import AddressManager from '../components/AddressManager'

interface Order {
  id: number
  orderNumber: string
  totalAmount: number
  status: string
  createdAt: string
  branch: {
    name: string
    address: string
  }
  items: Array<{
    quantity: number
    price: number
    product: {
      name: string
      description: string
    }
  }>
}

interface ProfileData {
  user: {
    id: number
    name: string
    email: string
    phone: string | null
    address: string | null
    role: string
  }
  orders: Order[]
}

export default function ProfilePage() {
  const { user, token, logout, login } = useAuthStore()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  useEffect(() => {
    if (!user || !token) {
      router.push('/')
      return
    }
    fetchProfile()
  }, [user, token])

  const fetchProfile = async () => {
    if (!token) {
      console.error('Token bulunamadı');
      toast.error('Giriş yapmanız gerekiyor');
      router.push('/');
      return;
    }

    try {
      console.log('Token:', token);
      const response = await axios.get(API_ENDPOINTS.CUSTOMER_PROFILE, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // API response kontrolü
      if (!response.data || !response.data.user) {
        throw new Error('Geçersiz API response');
      }
      
      setProfileData(response.data)
      setFormData({
        name: response.data.user.name || '',
        email: response.data.user.email || '',
        phone: response.data.user.phone || '',
        address: response.data.user.address || ''
      })
      
      // Update auth store with latest user data
      if (token) {
        login(response.data.user, token)
      }
    } catch (error: any) {
      console.error('Profil yükleme hatası:', error);
      console.error('Error response:', error.response);
      toast.error('Profil bilgileri yüklenemedi')
      if (error.response?.status === 401) {
        logout()
        router.push('/')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    // Form validation
    if (!formData.name.trim()) {
      toast.error('Ad soyad alanı zorunludur')
      return
    }
    
    if (!formData.email.trim()) {
      toast.error('Email alanı zorunludur')
      return
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Geçerli bir email adresi giriniz')
      return
    }

    try {
      console.log('Profil güncelleniyor:', formData)
      console.log('Token:', token)
      console.log('API Endpoint:', API_ENDPOINTS.CUSTOMER_PROFILE)
      
      const response = await axios.put(API_ENDPOINTS.CUSTOMER_PROFILE, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Profil güncelleme başarılı:', response.data)
      toast.success('Profil başarıyla güncellendi')
      
      // Update both profileData and auth store
      setProfileData(prev => prev ? { ...prev, user: response.data.user } : null)

      // Update auth store with new user data
      if (token) {
        login(response.data.user, token)
      }

      // Formu yeni değerlerle güncelle
      setFormData({
        name: response.data.user.name || '',
        email: response.data.user.email || '',
        phone: response.data.user.phone || '',
        address: response.data.user.address || ''
      })

      setEditing(false)
    } catch (error: any) {
      console.error('Profil güncelleme hatası:', error)
      console.error('Error response:', error.response)
      console.error('Error message:', error.message)
      console.error('Error status:', error.response?.status)
      console.error('Error data:', error.response?.data)
      
      if (error.response?.status === 401) {
        toast.error('Oturum süresi dolmuş, lütfen tekrar giriş yapın')
        logout()
        router.push('/')
        return
      }
      
      toast.error(error.response?.data?.error || 'Profil güncellenemedi')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'PREPARING': return 'bg-blue-100 text-blue-800'
      case 'READY': return 'bg-green-100 text-green-800'
      case 'DELIVERED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Beklemede'
      case 'PREPARING': return 'Hazırlanıyor'
      case 'READY': return 'Hazır'
      case 'DELIVERED': return 'Teslim Edildi'
      case 'CANCELLED': return 'İptal Edildi'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Yükleniyor...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="text-2xl font-bold text-gray-900 hover:text-red-600 flex items-center space-x-2"
              >
                <span className="text-2xl">🥪</span>
                <span>Çizar Sipariş</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Hoş geldin, {user.name}!</span>
              <button 
                onClick={logout}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Profilim</h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Kişisel Bilgiler</h2>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                {editing ? 'İptal' : 'Düzenle'}
              </button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0555 123 45 67"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Adres bilgilerinizi girin"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleUpdateProfile}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setFormData({
                        name: profileData?.user.name || '',
                        email: profileData?.user.email || '',
                        phone: profileData?.user.phone || '',
                        address: profileData?.user.address || ''
                      })
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <p className="text-gray-900">{profileData?.user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{profileData?.user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <p className="text-gray-900">{profileData?.user.phone || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <p className="text-gray-900">{profileData?.user.address || 'Belirtilmemiş'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Adres Yönetimi</h2>
            <AddressManager />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sipariş Geçmişi</h2>
            {profileData?.orders && Array.isArray(profileData.orders) && profileData.orders.length > 0 ? (
              <div className="space-y-4">
                {profileData.orders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">Sipariş #{order.orderNumber}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          ₺{order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        <strong>Şube:</strong> {order.branch?.name || 'Şube bilgisi bulunamadı'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {order.items && Array.isArray(order.items) && order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{item.product?.name || 'Ürün adı bulunamadı'}</span>
                          <span>{item.quantity || 0} x ₺{(item.price || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Henüz sipariş geçmişiniz bulunmuyor</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 