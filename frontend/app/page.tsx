'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { API_ENDPOINTS } from '@/lib/api'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import ProductCard from '@/components/ProductCard'
import CategoryFilter from './components/CategoryFilter'
import Cart from '@/components/Cart'
import { useOptimizedFetch, useDebounce } from '@/hooks/useOptimizedFetch'
import { useOptimizedList } from '@/hooks/useMemoizedState'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  CheckCircle,
  Table as TableIcon,
  Building,
  Menu,
  X,
  ChefHat,
  Star,
  Clock,
  Sparkles,
  Eye,
  User,
  LogOut
} from 'lucide-react'

interface Branch {
  id: number
  name: string
  address: string
  phone: string
  isActive: boolean
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

interface CartItem {
  productId: number
  name: string
  price: number
  quantity: number
  image: string
  note?: string
}

// Açıklamayı kısalt fonksiyonu
const truncateDescription = (text: string, maxLength: number = 60) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export default function Home() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { addItem, getItemCount, clearCart } = useCartStore()

  // Optimize edilmiş state'ler
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [notes, setNotes] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '', 
    confirmPassword: '' 
  })
  const [isRegistering, setIsRegistering] = useState(false)



  // Optimize edilmiş list state'leri
  const { items: branches, setItems: setBranches } = useOptimizedList<Branch>()
  const { items: products, setItems: setProducts } = useOptimizedList<Product>()
  const { items: categories, setItems: setCategories } = useOptimizedList<string>()

  // Optimize edilmiş fetch hook'ları
  const { data: branchesData, loading: branchesLoading } = useOptimizedFetch<Branch[]>(
    API_ENDPOINTS.BRANCHES,
    { cacheTime: 10 * 60 * 1000 } // 10 dakika cache
  )

  // Şubeleri yükle
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
      }
    }

    // Branches data'sını set et
    if (branchesData) {
      setBranches(branchesData.filter(branch => branch.isActive));
    }
  }, [branchesData, setBranches])

  // Ürünleri yükle - optimize edilmiş
  useEffect(() => {
    if (!selectedBranch) return;

    setProductsLoading(true);
    
    const fetchProducts = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCTS(selectedBranch.id));
        const productsData = Array.isArray(response.data) ? response.data : [];
        
        // Category'leri string'e çevir
        const processedProducts = productsData.map((product: any) => ({
          ...product,
          category: typeof product.category === 'object' && product.category !== null 
            ? product.category.name 
            : product.category || 'Diğer'
        }));
        
        setProducts(processedProducts);
        
        // Kategorileri optimize et
        const productCategories = Array.from(new Set(processedProducts.map((p: any) => p.category)));
        
        setCategories(productCategories);
        setLoading(false);
        setProductsLoading(false);
      } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
        setLoading(false);
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedBranch, setProducts, setCategories]);

  // Kategori ikonları - basitleştirilmiş
  const getCategoryIcon = useCallback((category: string) => {
    const icons: { [key: string]: string } = {
      'Pizza': '🍕',
      'Burger': '🍔',
      'Sushi': '🍣',
      'Pasta': '🍝',
      'Salad': '🥗',
      'Soup': '🍲',
      'Dessert': '🍰',
      'Drink': '🥤',
      'Coffee': '☕',
      'Tea': '🫖',
      'Juice': '🧃',
      'Smoothie': '🥤',
      'Ice Cream': '🍦',
      'Cake': '🎂',
      'Cookie': '🍪',
      'Bread': '🥖',
      'Sandwich': '🥪',
      'Wrap': '🌯',
      'Taco': '🌮',
      'Burrito': '🌯',
      'Quesadilla': '🧀',
      'Nachos': '🌮',
      'Fajitas': '🥘',
      'Enchiladas': '🌮',
      'Tamales': '🌮',
      'Churros': '🍩',
      'Flan': '🍮',
      'Tres Leches': '🍰',
      'Arroz con Leche': '🍚',
      'Horchata': '🥤',
      'Agua Fresca': '🥤',
      'Jamaica': '🫖',
      'Tamarindo': '🫖',
      'Noodle': '🍜',
      'Wok': '🥘',
      'Stir Fry': '🥘',
      'Tempura': '🍤',
      'Gyoza': '🥟',
      'Dumpling': '🥟',
      'Spring Roll': '🥢',
      'Summer Roll': '🥢',
      'Banh Mi': '🥖',
      'Pho': '🍜',
      'Bun': '🍜',
      'Com Tam': '🍚',
      'Banh Xeo': '🥞',
      'Banh Cuon': '🥟',
      'Banh Khot': '🥞',
      'Banh Beo': '🥞',
      'Banh Bot Loc': '🥟',
      'Banh Nam': '🥟',
      'Banh It': '🥟',
      'Banh Tet': '🥟',
      'Banh Chung': '🥟',
      'Banh Day': '🥟',
      'Banh Gai': '🥟',
      'Banh Pia': '🥟',
      'Banh Pong Te': '🥟',
      'Banh Bo': '🥟',
      'Banh Duc': '🥟',
      'Banh Can': '🥟',
      'Banh Khoai': '🥞',
      'Ana Yemek': '🍽️',
      'Yan Ürün': '🍟',
      'Teneke İçecek': '🥤',
      'Döner': '🥙',
      'Kebap': '🍖',
      'Izgara': '🔥',
      'Çorba': '🍲',
      'Kahvaltı': '🍳',
      'Soğuk Sandviç': '🥪',
      'Diğer': '🍽️'
    }
    
    return icons[category] || '🍽️'
  }, [])

  const getAvailableCategories = useCallback(() => {
    const grouped = groupProductsByCategory(products)
    return ['Tümü', ...Object.keys(grouped)]
  }, [products, groupProductsByCategory])

  const addToCart = useCallback((product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image || ''
      }]);
    }
    
    toast.success(`${product.name} sepete eklendi!`)
  }, [cart])

  const removeFromCart = useCallback((productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
  }, [cart])

  const updateQuantity = useCallback((productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  }, [cart, removeFromCart])

  const getTotalPrice = useCallback(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart])

  const updateCartItemNote = useCallback((productId: number, note: string) => {
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, note }
        : item
    ));
  }, [cart])

  const handleBranchSelect = useCallback((branch: Branch) => {
    setSelectedBranch(branch);
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
    setSelectedCategory('Tümü');
    toast.success(`${branch.name} şubesi seçildi`);
  }, [])

  const handleProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowProductModal(true);
  }, [])

  const handleAddToCartFromModal = useCallback(() => {
    if (selectedProduct) {
      for (let i = 0; i < quantity; i++) {
        addToCart(selectedProduct);
      }
      setShowProductModal(false);
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [selectedProduct, quantity, addToCart])

  const handlePlaceOrder = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Sepetiniz boş');
      return;
    }

    if (!selectedBranch) {
      toast.error('Lütfen önce şube seçin');
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          note: item.note || ''
        })),
        notes: notes,
        branchId: selectedBranch.id,
        orderType: 'DELIVERY'
      };

      const response = await axios.post(API_ENDPOINTS.ORDERS, orderData);
      
      if (response.data) {
        toast.success('Siparişiniz başarıyla alındı!');
        setCart([]);
        clearCart();
        setNotes('');
        setShowCart(false);
      }
    } catch (error: any) {
      console.error('Sipariş hatası:', error);
      toast.error('Sipariş alınamadı');
    }
  }, [cart, notes, selectedBranch, clearCart, user])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_ENDPOINTS.LOGIN, loginForm);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Giriş başarılı!');
        setShowLoginModal(false);
        setLoginForm({ email: '', password: '' });
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Giriş hatası:', error);
      toast.error('Giriş başarısız');
    }
  }, [loginForm])

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    try {
      const response = await axios.post(API_ENDPOINTS.REGISTER, {
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password
      });
      if (response.data) {
        toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
        setIsRegistering(false);
        setRegisterForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      }
    } catch (error: any) {
      console.error('Kayıt hatası:', error);
      toast.error('Kayıt başarısız');
    }
  }, [registerForm])

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.branch-dropdown')) {
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtrelenmiş ürünler - memoize edilmiş
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Kategori filtresi
    if (selectedCategory !== 'Tümü') {
      filtered = filtered.filter(product => {
        const categoryName = typeof product.category === 'object' && product.category !== null 
          ? product.category.name 
          : product.category || 'Diğer'
        return categoryName === selectedCategory
      })
    }

    return filtered
  }, [products, selectedCategory])

  // Gruplandırılmış ürünler - memoize edilmiş
  const groupedProducts = useMemo(() => {
    return groupProductsByCategory(filteredProducts)
  }, [filteredProducts, groupProductsByCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
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
            {/* Logo ve Şube Bilgisi */}
            <div className="flex items-center space-x-4 lg:space-x-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm sm:text-xl">🥪</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Çizar Sipariş
                </h1>
              </div>
              
              {/* Şube Bilgisi */}
              <div className="hidden lg:block">
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm border-2 border-orange-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">
                  <Building className="h-4 w-4" />
                  <span>{selectedBranch?.name || 'Şube Seçilmedi'}</span>
                </div>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              
              {/* Şube Seçici Dropdown */}
              <div className="relative branch-dropdown">
                <button
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm border-2 border-orange-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:border-orange-400 transition-all duration-200"
                >
                  <Building className="h-4 w-4" />
                  <span>{selectedBranch?.name || 'Şube Seç'}</span>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${showBranchDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {showBranchDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
                    <div className="p-2">
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            handleBranchSelect(branch);
                            setShowBranchDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-orange-50 transition-colors duration-200 flex items-center space-x-3"
                        >
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Building className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{branch.name}</div>
                            <div className="text-xs text-gray-500">{branch.address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Admin Panel */}
              <button
                onClick={() => router.push('/admin')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ⚙️ Admin
              </button>
              
              {/* Desktop Sepet Butonu */}
              <button 
                onClick={() => setShowCart(!showCart)}
                className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="hidden sm:inline">🛒 Sepet</span>
                <span className="sm:hidden">🛒</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center font-bold animate-pulse">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>

              {/* Kullanıcı Giriş Durumu */}
              {user ? (
                // Giriş yapmış kullanıcı - Profil ve Çıkış
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => router.push('/profile')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Profil</span>
                  </button>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Çıkış</span>
                  </button>
                </div>
              ) : (
                // Giriş yapmamış kullanıcı - Giriş Butonu
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Giriş Yap</span>
                  <span className="sm:hidden">Giriş</span>
                </button>
              )}
            </div>

            {/* Mobil Menü Butonu */}
            <div className="flex md:hidden items-center space-x-2">
              
              {/* Mobil Şube Dropdown */}
              <div className="relative branch-dropdown">
                <button
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm border-2 border-orange-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:border-orange-400 transition-all duration-200"
                >
                  <Building className="h-3 w-3" />
                  <span className="hidden sm:inline">{selectedBranch?.name || 'Şube'}</span>
                  <svg className={`w-3 h-3 transition-transform duration-200 ${showBranchDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Mobil Dropdown Menu */}
                {showBranchDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
                    <div className="p-2">
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            handleBranchSelect(branch);
                            setShowBranchDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors duration-200 flex items-center space-x-2"
                        >
                          <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Building className="h-3 w-3 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">{branch.name}</div>
                            <div className="text-xs text-gray-500 truncate">{branch.address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobil Admin Butonu */}
              <button
                onClick={() => router.push('/admin')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-2 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
              >
                ⚙️
              </button>
              
              {/* Mobil Giriş/Kullanıcı Butonu */}
              {user ? (
                // Giriş yapmış kullanıcı - Profil ve Çıkış
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => router.push('/profile')}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-2 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg"
                  >
                    👤
                  </button>
                  <button
                    onClick={logout}
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-2 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg"
                  >
                    🚪
                  </button>
                </div>
              ) : (
                // Giriş yapmamış kullanıcı - Giriş Butonu
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-2 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
                >
                  👤
                </button>
              )}
              
              {/* Mobil Sepet Butonu */}
              <button 
                onClick={() => setShowCart(!showCart)}
                className="relative bg-gradient-to-r from-orange-500 to-red-500 text-white p-2 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
              >
                🛒
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Responsive Content Section */}
      <main className="relative">
        <div className="max-w-6xl mx-auto">
          {/* Şube seçilmemişse mesaj göster */}
          {!selectedBranch && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 mb-6 sm:mb-8 text-center">
              <div className="text-6xl mb-6">🏪</div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Şube Seçin
              </h3>
              <p className="text-lg sm:text-xl text-gray-600 mb-6">
                Sipariş vermek için yukarıdaki şube dropdown'ından şubenizi seçin
              </p>
              <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-200 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  💡 <strong>İpucu:</strong> Header'daki şube seçici dropdown'ını kullanarak şubenizi seçebilirsiniz
                </p>
              </div>
            </div>
          )}
          
          {selectedBranch && (
            <>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
                  <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                      <ChefHat className="text-white text-lg sm:text-xl" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                        {selectedBranch.name} - Menü
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        Lezzetli yemekler ve içecekler
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold">
                    🎯 {products.length} ürün
                  </div>
                </div>
                
                {/* Responsive Kategori Filtreleme */}
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
              
              {/* Ürün Listesi */}
              {productsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Ürünler yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-8 sm:space-y-12">
                  {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
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
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {categoryProducts.map((product) => (
                          <div 
                            key={product.id} 
                            className="bg-gradient-to-br from-gray-50 to-white rounded-lg sm:rounded-xl p-3 sm:p-6 border-2 border-orange-100 hover:border-orange-300 hover:shadow-xl transition-all duration-200 transform hover:scale-105 group cursor-pointer flex flex-col h-full"
                            onClick={() => handleProductClick(product)}
                          >
                            {(product.image || product.imagePath) && (
                              <div className="mb-2 sm:mb-4 relative overflow-hidden rounded-lg sm:rounded-xl">
                                <img
                                  src={API_ENDPOINTS.IMAGE_URL(product.image || product.imagePath || '')}
                                  alt={product.name}
                                  className="w-full h-24 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-image.svg';
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                              </div>
                            )}
                            
                            {/* Ürün adı */}
                            <h5 className="text-sm sm:text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-2 sm:mb-3 leading-tight">
                              {product.name}
                            </h5>
                            
                            {/* Açıklama */}
                            <p className="text-xs sm:text-base text-gray-600 mb-3 sm:mb-4 flex-grow line-clamp-2">
                              {truncateDescription(product.description)}
                            </p>
                            
                            {/* Alt kısım - kategori, fiyat ve buton */}
                            <div className="mt-auto">
                              <div className="flex justify-between items-center mb-2 sm:mb-3">
                                <span className="text-xs text-gray-500 bg-orange-100 px-2 sm:px-3 py-1 rounded-full font-semibold">
                                  {typeof product.category === 'object' ? product.category.name : product.category}
                                </span>
                                
                                {/* Fiyat */}
                                <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                                  ₺{product.price.toFixed(2)}
                                </span>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
            </>
          )}
        </div>
      </main>

      {/* Responsive Sepet Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">🛒 Sepetiniz</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>
            
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Sepetiniz boş</p>
                <p className="text-sm text-gray-400">Menüden ürün seçin</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <ChefHat className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="h-6 w-6 p-0 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-semibold text-gray-700">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="h-6 w-6 p-0 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="font-bold text-orange-600">₺{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Not ekle..."
                          value={item.note || ''}
                          onChange={e => updateCartItemNote(item.productId, e.target.value)}
                          className="mt-2 text-sm w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4 space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Toplam:</span>
                    <span className="text-2xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      ₺{getTotalPrice().toFixed(2)}
                    </span>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Sipariş notu (opsiyonel)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={handlePlaceOrder}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg flex items-center justify-center"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Siparişi Tamamla
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ürün Detay Modalı */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-md sm:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{selectedProduct.name}</h2>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                  setQuantity(1);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Resim */}
              {(selectedProduct.image || selectedProduct.imagePath) && (
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={API_ENDPOINTS.IMAGE_URL(selectedProduct.image || selectedProduct.imagePath || '')}
                    alt={selectedProduct.name}
                    className="w-full h-64 sm:h-80 object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-image.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              )}

              {/* Ürün Bilgileri */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Ürün Açıklaması</h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {selectedProduct.description || 'Bu ürün için açıklama bulunmamaktadır.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Kategori</h3>
                  <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {typeof selectedProduct.category === 'object' ? selectedProduct.category.name : selectedProduct.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Fiyat</h3>
                  <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                    ₺{selectedProduct.price.toFixed(2)}
                  </span>
                </div>

                {/* Miktar Seçimi */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Miktar</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="text-lg sm:text-xl font-semibold text-gray-900 min-w-[2rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Toplam Fiyat */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Toplam:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      ₺{(selectedProduct.price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sepete Ekle Butonu */}
                <button
                  onClick={handleAddToCartFromModal}
                  className="w-full py-3 sm:py-4 px-6 rounded-xl text-lg sm:text-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                >
                  🛒 {quantity} Adet Sepete Ekle
                </button>
              </div>
            </div>
          </div>
                 </div>
       )}

       {/* Giriş Modalı */}
       {showLoginModal && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold text-gray-900">
                 {isRegistering ? '📝 Kayıt Ol' : '🔐 Giriş Yap'}
               </h2>
               <button
                 onClick={() => {
                   setShowLoginModal(false);
                   setIsRegistering(false);
                   setLoginForm({ email: '', password: '' });
                   setRegisterForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
                 }}
                 className="text-gray-400 hover:text-gray-600 text-xl hover:scale-110 transition-transform"
               >
                 ✕
               </button>
             </div>

             {isRegistering ? (
               <form onSubmit={handleRegister} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                   <input
                     type="text"
                     required
                     value={registerForm.name}
                     onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="Adınız ve soyadınız"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                   <input
                     type="email"
                     required
                     value={registerForm.email}
                     onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="ornek@email.com"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                   <input
                     type="tel"
                     required
                     value={registerForm.phone}
                     onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="0555 123 45 67"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                   <input
                     type="password"
                     required
                     value={registerForm.password}
                     onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="••••••••"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
                   <input
                     type="password"
                     required
                     value={registerForm.confirmPassword}
                     onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="••••••••"
                   />
                 </div>
                 <button
                   type="submit"
                   className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
                 >
                   📝 Kayıt Ol
                 </button>
                 <div className="text-center">
                   <button
                     type="button"
                     onClick={() => setIsRegistering(false)}
                     className="text-orange-600 hover:text-orange-800 text-sm"
                   >
                     Zaten hesabınız var mı? Giriş yapın
                   </button>
                 </div>
               </form>
             ) : (
               <form onSubmit={handleLogin} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                   <input
                     type="email"
                     required
                     value={loginForm.email}
                     onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="ornek@email.com"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                   <input
                     type="password"
                     required
                     value={loginForm.password}
                     onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                     placeholder="••••••••"
                   />
                 </div>
                 <button
                   type="submit"
                   className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg"
                 >
                   🔐 Giriş Yap
                 </button>
                 <div className="text-center">
                   <button
                     type="button"
                     onClick={() => setIsRegistering(true)}
                     className="text-orange-600 hover:text-orange-800 text-sm"
                   >
                     Hesabınız yok mu? Kayıt olun
                   </button>
                 </div>
               </form>
             )}
           </div>
         </div>
       )}
     </div>
   )
 }

// Ürünleri kategoriye göre grupla
function groupProductsByCategory(products: Product[]) {
  const grouped: { [key: string]: Product[] } = {}
  
  products.forEach(product => {
    const categoryName = typeof product.category === 'object' && product.category !== null 
      ? product.category.name 
      : product.category || 'Diğer'
    
    if (!grouped[categoryName]) {
      grouped[categoryName] = []
    }
    grouped[categoryName].push(product)
  })
  
  return grouped
} 