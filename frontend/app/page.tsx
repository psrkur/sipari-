'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import LoginModal from '../components/LoginModal'
import RegisterModal from '../components/RegisterModal'
import Cart from '../components/Cart'
import { useAuthStore } from '../store/auth'
import { API_ENDPOINTS } from '../lib/api'
import { useCartStore } from '../store/cart'
import toast from 'react-hot-toast'
import BranchSelector from './components/BranchSelector';
import ProductList from './components/ProductList';
import CategoryFilter from './components/CategoryFilter';
import Chatbot from '../components/Chatbot';

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
  imagePath?: string
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
  const [categories, setCategories] = useState<string[]>([])
  const { user, logout } = useAuthStore()
  const { addItem, getItemCount } = useCartStore()

  useEffect(() => {
    // Local storage'dan seçili şubeyi kontrol et
    const savedBranch = localStorage.getItem('selectedBranch');
    if (savedBranch) {
      try {
        const parsedBranch = JSON.parse(savedBranch);
        setSelectedBranch(parsedBranch);
      } catch (error) {
        console.error('Kayıtlı şube bilgisi okunamadı:', error);
        localStorage.removeItem('selectedBranch');
        // Hatalı veri varsa şube seçme sayfasına yönlendir
        router.push('/branch-select');
        return;
      }
    } else {
      // Şube seçilmemişse direkt şube seçme sayfasına yönlendir
      router.push('/branch-select');
      return;
    }

    // API'den şubeleri çek
    axios.get(API_ENDPOINTS.BRANCHES)
      .then((response: any) => {
        console.log('Şubeler yüklendi:', response.data);
        setBranches(response.data);
      })
      .catch((error: any) => {
        console.error('Şubeler yüklenemedi:', error);
        // Fallback mock data
        setBranches([
          { id: 1, name: 'Merkez Şube', address: 'Atatürk Caddesi No:1, İstanbul', phone: '0212 555 0001' },
          { id: 2, name: 'Kadıköy Şube', address: 'Moda Caddesi No:15, İstanbul', phone: '0216 555 0002' }
        ]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router])

  useEffect(() => {
    if (selectedBranch) {
      setProductsLoading(true);
      // API'den ürünleri çek
      axios.get(API_ENDPOINTS.PRODUCTS(selectedBranch.id))
        .then((response: any) => {
          console.log('Ürünler yüklendi:', response.data);
          
          // Response.data'nın array olduğundan emin ol
          const productsData = Array.isArray(response.data) ? response.data : [];
          setProducts(productsData);
          
          // Kategorileri yükle ve sırala
          const productCategories: string[] = Array.from(new Set(productsData.map((p: any) => 
            typeof p.category === 'object' && p.category !== null ? p.category.name : p.category || 'Diğer'
          )));
          
          // LocalStorage'dan kayıtlı sıralamayı kontrol et
          const savedOrder = localStorage.getItem('categoryOrder');
          if (savedOrder) {
            try {
              const orderIds = JSON.parse(savedOrder);
              // Backend'den kategorileri çek ve sırala
              axios.get(API_ENDPOINTS.CATEGORIES)
                .then((catResponse: any) => {
                  const backendCategories = Array.isArray(catResponse.data) ? catResponse.data : [];
                  const orderedCategories = orderIds.map((id: number) => 
                    backendCategories.find((cat: any) => cat.id === id)
                  ).filter(Boolean);
                  
                  const orderedCategoryNames = orderedCategories.map((cat: any) => cat.name).filter(Boolean);
                  const remainingCategories = productCategories.filter((cat: string) => !orderedCategoryNames.includes(cat));
                  
                  setCategories(['Tümü', ...orderedCategoryNames, ...remainingCategories]);
                })
                .catch(() => {
                  // Hata durumunda normal sıralama
                  setCategories(['Tümü', ...productCategories]);
                });
            } catch (error) {
              console.error('Kategori sıralama hatası:', error);
              setCategories(['Tümü', ...productCategories]);
            }
          } else {
            setCategories(['Tümü', ...productCategories]);
          }
        })
        .catch((error: any) => {
          console.error('Ürünler yüklenemedi:', error);
          setProducts([]);
          setCategories(['Tümü']);
        })
        .finally(() => {
          setProductsLoading(false);
        });
    }
  }, [selectedBranch])



  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    setSelectedCategory('Tümü') // Şube değiştiğinde kategori seçimini sıfırla
    setShowMobileMenu(false) // Mobil menüyü kapat
    setShowBranchDropdown(false) // Dropdown'ı kapat
    // Local storage'a kaydet
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
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

  // Kategorileri çıkar ve sırala
  const getAvailableCategories = () => {
    return categories.length > 0 ? categories : ['Tümü'];
  };

  // Sepete ekle fonksiyonu
  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error('Sipariş vermek için giriş yapın');
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: typeof product.category === 'object' && product.category !== null ? product.category.name : product.category,
      quantity: 1
    });
    toast.success(`${product.name} sepete eklendi`);
  };

  // Şube seçimi kontrolü
  useEffect(() => {
    if (!loading && !selectedBranch) {
      // Şube seçilmediyse şube seçme sayfasına yönlendir
      router.push('/branch-select');
    }
  }, [loading, selectedBranch, router]);

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

  // Şube seçilmediyse şube seçme sayfasına yönlendir
  if (!selectedBranch) {
    router.push('/branch-select');
    return null;
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
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm sm:text-xl">🥪</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Çizar Sipariş
                </h1>
              </div>
              
              {/* Desktop Şube Dropdown */}
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
                
                {/* Dropdown Menu */}
                {showBranchDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-orange-200 z-50">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 px-3 py-2 border-b border-gray-100">
                        Şube Seçin
                      </div>
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => handleBranchSelect(branch)}
                          className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-orange-50 ${
                            selectedBranch?.id === branch.id
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="font-semibold text-sm">{branch.name}</div>
                          <div className="text-xs opacity-80 mt-1">{branch.address}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobil Logo */}
            <div className="flex md:hidden items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-sm">🥪</span>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Çizar Sipariş
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
                  {user.role === 'CUSTOMER' && (
                    <button 
                      onClick={() => router.push('/orders')}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg"
                    >
                      <span className="hidden sm:inline">📋 Siparişlerim</span>
                      <span className="sm:hidden">📋</span>
                    </button>
                  )}
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
                  {user.role === 'CUSTOMER' && (
                    <button 
                      onClick={() => router.push('/orders')}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                    >
                      📋 Siparişlerim
                    </button>
                  )}
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

      {/* Dropdown dışına tıklandığında kapatma */}
      {showBranchDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowBranchDropdown(false)}
        />
      )}

      {/* Responsive Content Section */}
      <main className="relative">
        {!selectedBranch ? (
          <div className="text-center py-12 sm:py-16 lg:py-20">
            <BranchSelector
              branches={branches}
              selectedBranch={selectedBranch}
              onSelect={handleBranchSelect}
              className="max-w-4xl mx-auto px-4"
            />
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
              <CategoryFilter
                categories={getAvailableCategories()}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                getCategoryIcon={getCategoryIcon}
              />
            </div>
            
            {productsLoading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
                <div className="text-lg sm:text-xl text-gray-600">Lezzetli yemekler yükleniyor...</div>
              </div>
            ) : (
              <ProductList
                products={products}
                selectedCategory={selectedCategory}
                onAddToCart={handleAddToCart}
                user={user}
                getCategoryIcon={getCategoryIcon}
                API_ENDPOINTS={API_ENDPOINTS}
              />
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

      {/* Chatbot */}
      <Chatbot 
        customerId={user?.id}
        customerInfo={user ? {
          name: user.name,
          phone: user.phone || '',
          email: user.email,
          address: user.address || ''
        } : undefined}
      />
    </div>
  )
} 