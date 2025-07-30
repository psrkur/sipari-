'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '../../../store/auth'
import { API_ENDPOINTS } from '../../../lib/api'
import axios from 'axios'
import toast from 'react-hot-toast'

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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          E-ticaret Platformları
        </h1>
        <p className="text-gray-600">
          Harici e-ticaret platformları ile entegrasyon yönetimi
        </p>
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

              <div className="flex space-x-2">
                <button
                  onClick={() => handlePlatformSelect(platformName)}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {isActive ? 'Yapılandır' : 'Bağla'}
                </button>
                
                {isActive && (
                  <button
                    onClick={() => handleSyncMenu(platformName, 1)} // Şube ID'si
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Senkronize Et
                  </button>
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
    </div>
  )
} 