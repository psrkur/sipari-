'use client'

import { useState } from 'react'
import { API_ENDPOINTS } from '../../lib/api'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function AdminResetPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const resetSuperAdmin = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('🔄 Süper admin hesabı sıfırlanıyor...')
      
      const response = await axios.post(`${API_ENDPOINTS.BRANCHES.replace('/api/branches', '')}/api/admin/reset-super-admin`)
      
      console.log('✅ Süper admin sıfırlama başarılı:', response.data)
      setResult({
        success: true,
        data: response.data
      })
      toast.success('Süper admin hesabı başarıyla sıfırlandı!')
    } catch (error: any) {
      console.error('❌ Süper admin sıfırlama hatası:', error)
      setResult({
        success: false,
        error: error.message,
        data: error.response?.data
      })
      toast.error('Süper admin hesabı sıfırlanamadı: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const resetManager = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('🔄 Şube müdürü hesabı sıfırlanıyor...')
      
      const response = await axios.post(`${API_ENDPOINTS.BRANCHES.replace('/api/branches', '')}/api/admin/reset-manager`)
      
      console.log('✅ Şube müdürü sıfırlama başarılı:', response.data)
      setResult({
        success: true,
        data: response.data
      })
      toast.success('Şube müdürü hesabı başarıyla sıfırlandı!')
    } catch (error: any) {
      console.error('❌ Şube müdürü sıfırlama hatası:', error)
      setResult({
        success: false,
        error: error.message,
        data: error.response?.data
      })
      toast.error('Şube müdürü hesabı sıfırlanamadı: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🔐 Admin Hesap Sıfırlama</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">⚠️ Dikkat</h2>
          <div className="space-y-2 text-sm text-red-600">
            <p>• Bu işlem admin hesaplarını sıfırlar</p>
            <p>• Mevcut şifreler değiştirilir</p>
            <p>• Sadece acil durumlarda kullanın</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Admin Hesapları</h2>
          <div className="space-y-4">
            <div className="border p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">👑 Süper Admin</h3>
              <div className="text-sm space-y-1">
                <div><strong>Email:</strong> admin@example.com</div>
                <div><strong>Şifre:</strong> admin123</div>
                <div><strong>Rol:</strong> SUPER_ADMIN</div>
              </div>
              <button
                onClick={resetSuperAdmin}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Sıfırlanıyor...' : 'Süper Admin Sıfırla'}
              </button>
            </div>

            <div className="border p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">🏢 Şube Müdürü</h3>
              <div className="text-sm space-y-1">
                <div><strong>Email:</strong> manager@example.com</div>
                <div><strong>Şifre:</strong> manager123</div>
                <div><strong>Rol:</strong> BRANCH_MANAGER</div>
                <div><strong>Şube:</strong> Merkez Şube</div>
              </div>
              <button
                onClick={resetManager}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Sıfırlanıyor...' : 'Şube Müdürü Sıfırla'}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Sonuç</h2>
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="font-semibold mb-2">
                {result.success ? '✅ Başarılı' : '❌ Başarısız'}
              </div>
              <div className="text-sm space-y-1">
                {result.data?.message && <div><strong>Mesaj:</strong> {result.data.message}</div>}
                {result.data?.credentials && (
                  <div>
                    <strong>Giriş Bilgileri:</strong>
                    <div className="mt-2 bg-gray-100 p-3 rounded text-xs">
                      <div><strong>Email:</strong> {result.data.credentials.email}</div>
                      <div><strong>Şifre:</strong> {result.data.credentials.password}</div>
                    </div>
                  </div>
                )}
                {result.error && <div><strong>Hata:</strong> {result.error}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 