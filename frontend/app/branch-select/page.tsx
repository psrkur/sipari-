'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { API_ENDPOINTS } from '../../lib/api'
import toast from 'react-hot-toast'

interface Branch {
  id: number
  name: string
  address: string
  phone: string
  isActive: boolean
}

export default function BranchSelectPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const router = useRouter()

  useEffect(() => {
    // API'den şubeleri çek
    axios.get(API_ENDPOINTS.BRANCHES)
      .then((response: any) => {
        console.log('Şubeler yüklendi:', response.data);
        setBranches(response.data.filter((branch: Branch) => branch.isActive));
      })
      .catch((error: any) => {
        console.error('Şubeler yüklenemedi:', error);
        toast.error('Şubeler yüklenemedi');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [])

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch);
    // Local storage'a şube bilgisini kaydet
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
    // Ana sayfaya yönlendir
    router.push('/');
    toast.success(`${branch.name} şubesi seçildi`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
          <div className="text-xl sm:text-2xl font-bold text-gray-800">Şubeler Yükleniyor...</div>
          <div className="text-sm sm:text-base text-gray-600 mt-2">Lütfen bekleyin</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm sm:text-xl">🍔</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                FastFood
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Şube Seçin
          </h2>
          <p className="text-lg sm:text-xl text-gray-600">
            Sipariş vermek için size en yakın şubeyi seçin
          </p>
        </div>

        {branches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Şube Bulunamadı</h3>
            <p className="text-gray-600">Şu anda aktif şube bulunmamaktadır.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.id}
                onClick={() => handleBranchSelect(branch)}
                className="bg-white/80 backdrop-blur-sm border-2 border-orange-200 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">🏪</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {branch.name}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {branch.address}
                  </p>
                  <p className="text-orange-600 font-medium">
                    📞 {branch.phone}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Şube seçtikten sonra menüyü görüntüleyebilir ve sipariş verebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
} 