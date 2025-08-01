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

export default function Home() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { addItem, getItemCount } = useCartStore()

  // Optimize edilmiş state'ler
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)
  const [showBranchSelector, setShowBranchSelector] = useState(false)

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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
        setShowBranchSelector(true);
      }
    } else {
      setShowBranchSelector(true);
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
      'Diğer': '🍽️'
    }
    
    return icons[category] || '🍽️'
  }, [])

  const getAvailableCategories = useCallback(() => {
    const grouped = groupProductsByCategory(products)
    return ['Tümü', ...Object.keys(grouped)]
  }, [products, groupProductsByCategory])

  const handleAddToCart = useCallback((product: Product) => {
    const categoryName = typeof product.category === 'object' ? product.category.name : product.category;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      description: product.description,
      category: categoryName
    })
    toast.success(`${product.name} sepete eklendi!`)
  }, [addItem])

  const handleBranchSelect = useCallback((branch: Branch) => {
    setSelectedBranch(branch);
    localStorage.setItem('selectedBranch', JSON.stringify(branch));
    setShowBranchSelector(false);
    setSelectedCategory('Tümü');
    setSearchTerm('');
    toast.success(`${branch.name} şubesi seçildi`);
  }, [])

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

    // Arama filtresi
    if (debouncedSearchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    return filtered
  }, [products, selectedCategory, debouncedSearchTerm])

  // Gruplandırılmış ürünler - memoize edilmiş
  const groupedProducts = useMemo(() => {
    return groupProductsByCategory(filteredProducts)
  }, [filteredProducts, groupProductsByCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Şube seçici gösteriliyorsa
  if (showBranchSelector) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-orange-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 sm:h-20">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm sm:text-xl">🥪</span>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Çizar Sipariş
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
              Sipariş vermek için şubenizi seçin
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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">🍽️ Yemek5</h1>
              {selectedBranch && (
                <span className="text-sm text-gray-600">
                  Şube: {selectedBranch.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ürün ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowBranchSelector(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Şube Değiştir
              </button>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => router.push('/profile')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  👤 Profil
                </button>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  🚪 Çıkış
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sol Panel - Ürünler */}
          <div className="lg:col-span-3">
            {/* Kategori Filtresi */}
            <div className="mb-6">
              <CategoryFilter
                categories={getAvailableCategories()}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                getCategoryIcon={getCategoryIcon}
              />
            </div>

            {/* Ürünler */}
            {productsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Ürünler yükleniyor...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                  <div key={category}>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      {getCategoryIcon(category)} {category}
                    </h2>
                    <div className="space-y-4">
                      {categoryProducts.map((product: Product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sağ Panel - Sepet */}
          <div className="lg:col-span-1">
            <Cart selectedBranch={selectedBranch} />
          </div>
        </div>
      </div>
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