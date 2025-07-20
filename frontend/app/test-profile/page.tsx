'use client'

import { useState } from 'react'
import { useAuthStore } from '../../store/auth'
import { API_ENDPOINTS } from '../../lib/api'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function TestProfilePage() {
  const { user, token } = useAuthStore()
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testProfileUpdate = async () => {
    if (!token || !user) {
      toast.error('Giriş yapmanız gerekiyor')
      return
    }

    setLoading(true)
    setTestResult(null)

    try {
      console.log('🧪 Profil güncelleme testi başlatılıyor...')
      console.log('🧪 User:', user)
      console.log('🧪 Token var mı:', !!token)
      console.log('🧪 API Endpoint:', API_ENDPOINTS.CUSTOMER_PROFILE)

      const testData = {
        name: user.name,
        email: user.email,
        phone: user.phone || '0555 123 45 67',
        address: user.address || 'Test Adres'
      }

      console.log('🧪 Test Data:', testData)

      const response = await axios.put(API_ENDPOINTS.CUSTOMER_PROFILE, testData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('✅ Test başarılı:', response.data)
      setTestResult({
        success: true,
        data: response.data,
        status: response.status
      })
      toast.success('Profil güncelleme testi başarılı!')
    } catch (error: any) {
      console.error('❌ Test hatası:', error)
      setTestResult({
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
      toast.error('Test başarısız: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const testProfileGet = async () => {
    if (!token) {
      toast.error('Giriş yapmanız gerekiyor')
      return
    }

    setLoading(true)
    setTestResult(null)

    try {
      console.log('🧪 Profil getirme testi başlatılıyor...')
      
      const response = await axios.get(API_ENDPOINTS.CUSTOMER_PROFILE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('✅ Profil getirme başarılı:', response.data)
      setTestResult({
        success: true,
        data: response.data,
        status: response.status
      })
      toast.success('Profil getirme testi başarılı!')
    } catch (error: any) {
      console.error('❌ Profil getirme hatası:', error)
      setTestResult({
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      })
      toast.error('Profil getirme testi başarısız: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🧪 Profil API Test Sayfası</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Kullanıcı Bilgileri</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Kullanıcı:</strong> {user?.name || 'Giriş yapılmamış'}</div>
            <div><strong>Email:</strong> {user?.email || 'Giriş yapılmamış'}</div>
            <div><strong>Token:</strong> {token ? 'Mevcut' : 'Yok'}</div>
            <div><strong>API Base URL:</strong> {API_ENDPOINTS.CUSTOMER_PROFILE.replace('/api/customer/profile', '')}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Butonları</h2>
          <div className="flex gap-4">
            <button
              onClick={testProfileGet}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Test Ediliyor...' : 'Profil Getir Testi'}
            </button>
            <button
              onClick={testProfileUpdate}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Test Ediliyor...' : 'Profil Güncelle Testi'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Sonucu</h2>
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="font-semibold mb-2">
                {testResult.success ? '✅ Başarılı' : '❌ Başarısız'}
              </div>
              <div className="text-sm space-y-1">
                <div><strong>Status:</strong> {testResult.status}</div>
                {testResult.error && <div><strong>Hata:</strong> {testResult.error}</div>}
                {testResult.data && (
                  <div>
                    <strong>Veri:</strong>
                    <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 