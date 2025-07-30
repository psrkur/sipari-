'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '../../../store/auth'
import { API_ENDPOINTS } from '../../../lib/api'
import axios from 'axios'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Platform {
  name: string
  isActive: boolean
  lastSync: string | null
  config: {
    baseUrl: string
    enabled: boolean
  } | null
}

interface PlatformConfig {
  baseUrl: string
  apiKey: string
  apiSecret: string
  enabled: boolean
}

export default function EcommercePlatformsPage() {
  const { token } = useAuthStore()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [config, setConfig] = useState<PlatformConfig>({
    baseUrl: '',
    apiKey: '',
    apiSecret: '',
    enabled: false
  })
  const [showRecentOrdersModal, setShowRecentOrdersModal] = useState(false)
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [platformProducts, setPlatformProducts] = useState<any[]>([])
  const [selectedPlatformForModal, setSelectedPlatformForModal] = useState('')

  useEffect(() => {
    loadPlatforms()
  }, [])

  const loadPlatforms = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/integrations/platforms/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPlatforms(response.data.platforms)
    } catch (error) {
      console.error('Platforms load error:', error)
      toast.error('Platformlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handlePlatformSelect = (platformName: string) => {
    setSelectedPlatform(platformName)
    setShowConfigModal(true)
  }

  const handleConfigSubmit = async () => {
    try {
      await axios.post('/api/integrations/platforms/register', {
        platformName: selectedPlatform,
        config
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      toast.success(`${selectedPlatform} platformu başarıyla yapılandırıldı`)
      setShowConfigModal(false)
      loadPlatforms()
    } catch (error) {
      console.error('Platform config error:', error)
      toast.error('Platform yapılandırması başarısız')
    }
  }

  const handleSyncMenu = async (platformName: string, branchId: number) => {
    try {
      await axios.post(`/api/integrations/platforms/${platformName}/sync-menu/${branchId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(`${platformName} menüsü senkronize edildi`)
      loadPlatforms()
    } catch (error) {
      console.error('Menu sync error:', error)
      toast.error('Menü senkronizasyonu başarısız')
    }
  }

  const handleTogglePlatform = async (platformName: string, isActive: boolean) => {
    try {
      await axios.put(`/api/integrations/platforms/${platformName}/toggle`, {
        isActive: !isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success(`${platformName} platformu ${!isActive ? 'açıldı' : 'kapatıldı'}`)
      loadPlatforms()
    } catch (error) {
      console.error('Platform toggle error:', error)
      toast.error('Platform durumu değiştirilemedi')
    }
  }

  const handleShowRecentOrders = async (platformName: string) => {
    try {
      const response = await axios.get(`/api/integrations/platforms/${platformName}/recent-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRecentOrders(response.data.orders)
      setSelectedPlatformForModal(platformName)
      setShowRecentOrdersModal(true)
    } catch (error) {
      console.error('Recent orders error:', error)
      toast.error('Son siparişler yüklenemedi')
    }
  }

  const handleShowProducts = async (platformName: string) => {
    try {
      const response = await axios.get(`/api/integrations/platforms/${platformName}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPlatformProducts(response.data.products)
      setSelectedPlatformForModal(platformName)
      setShowProductsModal(true)
    } catch (error) {
      console.error('Platform products error:', error)
      toast.error('Platform ürünleri yüklenemedi')
    }
  }

  const getPlatformIcon = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case 'getir':
        return '🟢'
      case 'trendyol':
        return '🟠'
      case 'yemeksepeti':
        return '🟡'
      case 'migros':
        return '🔴'
      case 'carrefour':
        return '🔵'
      default:
        return '📦'
    }
  }

  const getPlatformName = (platformName: string) => {
    switch (platformName.toLowerCase()) {
      case 'getir':
        return 'Getir'
      case 'trendyol':
        return 'Trendyol'
      case 'yemeksepeti':
        return 'Yemeksepeti'
      case 'migros':
        return 'Migros'
      case 'carrefour':
        return 'Carrefour'
      default:
        return platformName
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              E-ticaret Platformları
            </h1>
            <p className="text-gray-600">
              Harici e-ticaret platformları ile entegrasyon yönetimi
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Admin Paneli
          </Link>
        </div>
      </div>

      {/* Platform Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {['getir', 'trendyol', 'yemeksepeti', 'migros', 'carrefour'].map((platformName) => {
          const platform = platforms.find(p => p.name === platformName)
          const isActive = platform?.isActive || false
          const lastSync = platform?.lastSync

          return (
            <div key={platformName} className="bg-white rounded-lg shadow-md p-6 border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getPlatformIcon(platformName)}</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getPlatformName(platformName)}
                  </h3>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isActive ? 'Aktif' : 'Pasif'}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Durum:</span> {isActive ? 'Bağlı' : 'Bağlı Değil'}
                </div>
                {lastSync && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Son Senkronizasyon:</span>
                    <br />
                    {new Date(lastSync).toLocaleString('tr-TR')}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePlatformSelect(platformName)}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {isActive ? 'Yapılandır' : 'Bağla'}
                </button>
                
                <button
                  onClick={() => handleTogglePlatform(platformName, isActive)}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isActive ? 'Kapat' : 'Aç'}
                </button>
                
                {isActive && (
                  <>
                    <button
                      onClick={() => handleSyncMenu(platformName, 1)}
                      className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Senkronize Et
                    </button>
                    
                    <button
                      onClick={() => handleShowProducts(platformName)}
                      className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
                    >
                      Ürünleri Göster
                    </button>
                    
                    <button
                      onClick={() => handleShowRecentOrders(platformName)}
                      className="px-3 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                    >
                      Son Siparişler
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aktif Platformlar</h3>
          <p className="text-3xl font-bold text-blue-600">
            {platforms.filter(p => p.isActive).length}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Platform</h3>
          <p className="text-3xl font-bold text-gray-600">
            {platforms.length}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Son 24 Saat</h3>
          <p className="text-3xl font-bold text-green-600">
            {platforms.filter(p => {
              if (!p.lastSync) return false
              const lastSync = new Date(p.lastSync)
              const now = new Date()
              return (now.getTime() - lastSync.getTime()) < 24 * 60 * 60 * 1000
            }).length}
          </p>
        </div>
      </div>

      {/* Konfigürasyon Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {getPlatformName(selectedPlatform)} Yapılandırması
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({...config, baseUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.platform.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="API Key"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  value={config.apiSecret}
                  onChange={(e) => setConfig({...config, apiSecret: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="API Secret"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={config.enabled}
                  onChange={(e) => setConfig({...config, enabled: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                  Platformu Aktif Et
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleConfigSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Kaydet
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Son Siparişler Modal */}
      {showRecentOrdersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {getPlatformName(selectedPlatformForModal)} - Son 10 Sipariş
              </h2>
              <button
                onClick={() => setShowRecentOrdersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz sipariş bulunmuyor</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order, index) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">Sipariş #{order.id}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'completed' ? 'Tamamlandı' :
                         order.status === 'pending' ? 'Beklemede' : 'İşleniyor'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <p><strong>Müşteri:</strong> {order.customer?.name || 'Bilinmiyor'}</p>
                      <p><strong>Toplam:</strong> ₺{order.totalAmount}</p>
                    </div>
                    
                    <div className="text-sm">
                      <p className="font-medium mb-1">Ürünler:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {order.items?.map((item: any) => (
                          <li key={item.id}>
                            {item.product?.name} x{item.quantity} - ₺{item.price}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Platform Ürünleri Modal */}
      {showProductsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {getPlatformName(selectedPlatformForModal)} - Platform Ürünleri
              </h2>
              <button
                onClick={() => setShowProductsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {platformProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Platform ürünleri bulunamadı</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformProducts.map((product: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-sm">{product.name}</h3>
                        <p className="text-sm text-gray-600">₺{product.price}</p>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><strong>ID:</strong> {product.id}</p>
                      <p><strong>Kategori:</strong> {product.category}</p>
                      <p><strong>Durum:</strong> {product.available ? 'Mevcut' : 'Mevcut Değil'}</p>
                      {product.description && (
                        <p><strong>Açıklama:</strong> {product.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 