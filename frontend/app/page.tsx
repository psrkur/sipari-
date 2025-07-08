'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'
import Cart from '../components/Cart'
import { useAuthStore } from '../store/auth'
import { useCartStore } from '../store/cart'
import toast from 'react-hot-toast'

interface Branch {
  id: number
  name: string
  address: string
  phone: string
}

interface Product {
  id: number
  name: string
  description: string
  price: number
  category: string | { id: number; name: string; description: string; isActive: boolean }
  image?: string
}

export default function Home() {
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const { user, logout } = useAuthStore()
  const { addItem, getItemCount } = useCartStore()

  useEffect(() => {
    // Mock data for now
    setBranches([
      { id: 1, name: 'Merkez Şube', address: 'Atatürk Caddesi No:1, İstanbul', phone: '0212 555 0001' },
      { id: 2, name: 'Kadıköy Şube', address: 'Moda Caddesi No:15, İstanbul', phone: '0216 555 0002' }
    ])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      setProductsLoading(true);
      // API'den ürünleri çek
      axios.get(`http://localhost:3001/api/products/${selectedBranch.id}`)
        .then((response: any) => {
          console.log('Ürünler yüklendi:', response.data);
          setProducts(response.data);
        })
        .catch((error: any) => {
          console.error('Ürünler yüklenemedi:', error);
          setProducts([]);
        })
        .finally(() => {
          setProductsLoading(false);
        });
    }
  }, [selectedBranch])

  // Dropdown dışına tıklandığında kapatma
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.branch-dropdown')) {
        setShowBranchDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    setSelectedCategory('Tümü') // Şube değiştiğinde kategori seçimini sıfırla
    setShowMobileMenu(false) // Mobil menüyü kapat
  }

  // Ürünleri kategorilere göre gruplandır
  const groupProductsByCategory = (products: Product[]) => {
    const grouped = products.reduce((acc, product) => {
      // Kategori bir obje ise name'ini al, string ise direkt kullan
      const categoryName = typeof product.category === 'object' && product.category !== null 
        ? product.category.name 
        : product.category || 'Diğer'
      
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(product)
      return acc
    }, {} as Record<string, Product[]>)
    
    return grouped
  }

  // Kategori ikonları
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Ana Yemek': '🍽️',
      'Pizza': '🍕',
      'Burger': '🍔',
      'Yan Ürün': '🍟',
      'İçecek': '🥤',
      'Tatlı': '🍰',
      'Döner': '🥙',
      'Kebap': '🍖',
      'Izgara': '🔥',
      'Salata': '🥗',
      'Çorba': '🍲',
      'Kahvaltı': '🍳',
      'Diğer': '🍽️'
    }
    return icons[category] || '🍽️'
  }

  // Mevcut kategorileri al
  const getAvailableCategories = () => {
    const categories = Object.keys(groupProductsByCategory(products))
    return ['Tümü', ...categories]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
          <div className="text-xl sm:text-2xl font-bold text-gray-800">Yükleniyor...</div>
          <div className="text-sm sm:text-base text-gray-600 mt-2">Lezzetli yemekler hazırlanıyor</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Responsive Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo ve Şube Seçimi - Desktop */}
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm sm:text-xl">🍔</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  FastFood
                </h1>
              </div>
              
              {/* Desktop Şube Seçimi */}
              <div className="relative branch-dropdown hidden lg:block">
                <button
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="flex items-center space-x-2 sm:space-x-3 bg-white/90 backdrop-blur-sm border-2 border-orange-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:border-orange-300 focus:outline-none focus:ring-4 focus:ring-orange-200 transition-all duration-200 shadow-md"
                >
                  <span className="text-sm sm:text-lg">🏪</span>
                  <span className="hidden sm:inline">{selectedBranch ? selectedBranch.name : 'Şube Seç'}</span>
                  <span className="sm:hidden">{selectedBranch ? 'Seçili' : 'Şube'}</span>
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${showBranchDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showBranchDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 sm:w-80 bg-white/95 backdrop-blur-md border-2 border-orange-200 rounded-xl shadow-2xl z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="py-2">
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            handleBranchSelect(branch)
                            setShowBranchDropdown(false)
                          }}
                          className="w-full text-left px-4 sm:px-6 py-3 sm:py-4 hover:bg-orange-50 focus:bg-orange-50 focus:outline-none transition-colors duration-150"
                        >
                          <div className="font-semibold text-gray-900 text-sm sm:text-lg">{branch.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 mt-1">{branch.address}</div>
                          <div className="text-xs text-orange-600 mt-1">📞 {branch.phone}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobil Logo */}
            <div className="flex md:hidden items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm">🍔</span>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                FastFood
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              {user ? (
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <div className="hidden lg:block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg">
                    👋 Hoş geldin, {user.name}!
                  </div>
                  
                  {/* Desktop Sepet Butonu */}
                  <button 
                    onClick={() => setShowCart(!showCart)}
                    className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span className="hidden sm:inline">🛒 Sepet</span>
                    <span className="sm:hidden">🛒</span>
                    {getItemCount() > 0 && (
                      <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center font-bold animate-pulse">
                        {getItemCount()}
                      </span>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => router.push('/profile')}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg"
                  >
                    <span className="hidden sm:inline">👤 Profilim</span>
                    <span className="sm:hidden">👤</span>
                  </button>
                  {(user.role === 'SUPER_ADMIN' || user.role === 'BRANCH_MANAGER') && (
                    <button 
                      onClick={() => router.push('/admin')}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
                    >
                      <span className="hidden sm:inline">{user.role === 'SUPER_ADMIN' ? '👑 Süper Admin' : '🏢 Şube Yönetimi'}</span>
                      <span className="sm:hidden">{user.role === 'SUPER_ADMIN' ? '👑' : '🏢'}</span>
                    </button>
                  )}
                  <button 
                    onClick={logout}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg"
                  >
                    <span className="hidden sm:inline">🚪 Çıkış</span>
                    <span className="sm:hidden">🚪</span>
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2 sm:space-x-3">
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span className="hidden sm:inline">🔑 Giriş</span>
                    <span className="sm:hidden">🔑</span>
                  </button>
                  <button 
                    onClick={() => setShowRegisterModal(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span className="hidden sm:inline">✨ Kayıt Ol</span>
                    <span className="sm:hidden">✨</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobil Menü Butonu */}
            <div className="flex md:hidden items-center space-x-2">
              {/* Mobil Sepet Butonu */}
              <button 
                onClick={() => setShowCart(!showCart)}
                className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white p-2 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
              >
                🛒
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                    {getItemCount()}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobil Menü */}
          {showMobileMenu && (
            <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-orange-100 py-4">
              {/* Mobil Şube Seçimi */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Şube Seçin</label>
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => handleBranchSelect(branch)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 ${
                        selectedBranch?.id === branch.id
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-orange-100'
                      }`}
                    >
                      <div className="font-semibold">{branch.name}</div>
                      <div className="text-xs opacity-80">{branch.address}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobil Kullanıcı Menüsü */}
              {user ? (
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-xl text-sm font-semibold">
                    👋 Hoş geldin, {user.name}!
                  </div>
                  <button 
                    onClick={() => router.push('/profile')}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-200"
                  >
                    👤 Profilim
                  </button>
                  {(user.role === 'SUPER_ADMIN' || user.role === 'BRANCH_MANAGER') && (
                    <button 
                      onClick={() => router.push('/admin')}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                    >
                      {user.role === 'SUPER_ADMIN' ? '👑 Süper Admin' : '🏢 Şube Yönetimi'}
                    </button>
                  )}
                  <button 
                    onClick={logout}
                    className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
                  >
                    🚪 Çıkış
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:from-red-600 hover:to-orange-600 transition-all duration-200"
                  >
                    🔑 Giriş
                  </button>
                  <button 
                    onClick={() => setShowRegisterModal(true)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                  >
                    ✨ Kayıt Ol
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Responsive Content Section */}
      <main className="relative">
        {!selectedBranch ? (
          <div className="text-center py-12 sm:py-16 lg:py-20">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <span className="text-2xl sm:text-3xl lg:text-4xl">🏪</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Şube Seçin
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Lezzetli yemeklerinizi sipariş etmek için lütfen size en yakın şubeyi seçin
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto px-4">
              {branches.map((branch) => (
                <div 
                  key={branch.id}
                  onClick={() => handleBranchSelect(branch)}
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105 border-2 border-orange-100 hover:border-orange-300"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg sm:text-xl">🏪</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">{branch.name}</h3>
                      <p className="text-sm text-gray-600">{branch.address}</p>
                      <p className="text-xs sm:text-sm text-orange-600 font-semibold">📞 {branch.phone}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg sm:text-xl">🍽️</span>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                      {selectedBranch.name} - Menü
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600">{selectedBranch.address}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold">
                  🎯 {products.length} ürün
                </div>
              </div>
              
              {/* Responsive Kategori Filtreleme */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                  {getAvailableCategories().map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-700'
                      }`}
                    >
                      {category === 'Tümü' ? '🍽️ Tümü' : `${getCategoryIcon(category)} ${category}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {productsLoading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
                <div className="text-lg sm:text-xl text-gray-600">Lezzetli yemekler yükleniyor...</div>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-12">
                {Object.entries(groupProductsByCategory(products))
                  .filter(([category]) => selectedCategory === 'Tümü' || category === selectedCategory)
                  .map(([category, categoryProducts]) => (
                  <div key={category} className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center mb-6 sm:mb-8">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4 mb-3 sm:mb-0">
                        <span className="text-2xl sm:text-3xl">{getCategoryIcon(category)}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl sm:text-2xl font-bold text-gray-900">{category}</h4>
                        <p className="text-sm sm:text-base text-gray-600">{categoryProducts.length} lezzetli seçenek</p>
                      </div>
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold mt-3 sm:mt-0">
                        {categoryProducts.length} ürün
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {categoryProducts.map((product) => (
                        <div key={product.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-orange-100 hover:border-orange-300 hover:shadow-xl transition-all duration-200 transform hover:scale-105 group">
                          {/* Responsive Ürün Resmi */}
                          {product.image && (
                            <div className="mb-3 sm:mb-4 relative overflow-hidden rounded-lg sm:rounded-xl">
                              <img 
                                src={`http://localhost:3001${product.image}`}
                                alt={product.name}
                                className="w-full h-32 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                            <h5 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-2 sm:mb-0">{product.name}</h5>
                            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                              ₺{product.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                            <span className="text-xs text-gray-500 bg-orange-100 px-2 sm:px-3 py-1 rounded-full font-semibold self-start">
                              {typeof product.category === 'object' && product.category !== null 
                                ? product.category.name 
                                : product.category}
                            </span>
                            <button 
                              onClick={() => {
                                if (!user) {
                                  toast.error('Sipariş vermek için giriş yapın')
                                  return
                                }
                                addItem({
                                  id: product.id,
                                  name: product.name,
                                  description: product.description,
                                  price: product.price,
                                  category: typeof product.category === 'object' && product.category !== null 
                                    ? product.category.name 
                                    : product.category,
                                  quantity: 1
                                })
                                toast.success(`${product.name} sepete eklendi`)
                              }}
                              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              🛒 Sepete Ekle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSwitchToRegister={() => {
            setShowLoginModal(false)
            setShowRegisterModal(true)
          }}
        />
      )}

      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => {
            setShowRegisterModal(false)
            setShowLoginModal(true)
          }}
        />
      )}

      {/* Responsive Sepet Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🛒 Sepetim</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>
            <Cart selectedBranch={selectedBranch} />
          </div>
        </div>
      )}
    </div>
  )
} 