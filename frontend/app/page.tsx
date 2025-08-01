'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useCartStore } from '@/store/cart'
import { API_ENDPOINTS } from '@/lib/api'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import ProductCard from '@/components/ProductCard'
import CategoryFilter from '@/components/CategoryFilter'
import Cart from '@/components/Cart'
import { useOptimizedFetch, useDebounce } from '@/hooks/useOptimizedFetch'
import { useOptimizedList } from '@/hooks/useMemoizedState'

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
  const { user, logout } = useAuthStore()
  const { addItem, getItemCount } = useCartStore()

  // Optimize edilmiş state'ler
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [productsLoading, setProductsLoading] = useState(false)

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
        router.push('/branch-select');
        return;
      }
    } else {
      router.push('/branch-select');
      return;
    }

    // Branches data'sını set et
    if (branchesData) {
      setBranches(branchesData);
    }
  }, [branchesData, router, setBranches])

  // Ürünleri yükle - optimize edilmiş
  useEffect(() => {
    if (!selectedBranch) return;

    setProductsLoading(true);
    
    const fetchProducts = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCTS(selectedBranch.id));
        const productsData = Array.isArray(response.data) ? response.data : [];
        setProducts(productsData);
        
        // Kategorileri optimize et
        const productCategories = Array.from(new Set(productsData.map((p: any) => 
          typeof p.category === 'object' && p.category !== null ? p.category.name : p.category || 'Diğer'
        )));
        
        // LocalStorage'dan kayıtlı sıralamayı kontrol et
        const savedOrder = localStorage.getItem('categoryOrder');
        if (savedOrder) {
          try {
            const orderIds = JSON.parse(savedOrder);
            const categoriesResponse = await axios.get(API_ENDPOINTS.CATEGORIES);
            const backendCategories = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
            const orderedCategories = orderIds.map((id: number) => 
              backendCategories.find((cat: any) => cat.id === id)
            ).filter(Boolean);
            
            const orderedCategoryNames = orderedCategories.map((cat: any) => cat.name).filter(Boolean);
            const remainingCategories = productCategories.filter((cat: string) => !orderedCategoryNames.includes(cat));
            
            setCategories(['Tümü', ...orderedCategoryNames, ...remainingCategories]);
          } catch (error) {
            console.error('Kategori sıralama hatası:', error);
            setCategories(['Tümü', ...productCategories]);
          }
        } else {
          setCategories(['Tümü', ...productCategories]);
        }
      } catch (error: any) {
        console.error('Ürünler yüklenemedi:', error);
        setProducts([]);
        setCategories(['Tümü']);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedBranch, setProducts, setCategories])

  // Loading state'ini güncelle
  useEffect(() => {
    setLoading(branchesLoading);
  }, [branchesLoading])

  // Optimize edilmiş callback'ler
  const handleBranchSelect = useCallback((branch: Branch) => {
    setSelectedBranch(branch)
    localStorage.setItem('selectedBranch', JSON.stringify(branch))
    setSelectedCategory('Tümü')
    setSearchTerm('')
  }, [])

  const groupProductsByCategory = useCallback((products: Product[]) => {
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
  }, [])

  const getCategoryIcon = useCallback((category: string) => {
    const icons: { [key: string]: string } = {
      'Pizza': '🍕',
      'Burger': '🍔',
      'Salata': '🥗',
      'İçecek': '🥤',
      'Tatlı': '🍰',
      'Kahve': '☕',
      'Çay': '🫖',
      'Su': '💧',
      'Meyve': '🍎',
      'Sebze': '🥬',
      'Et': '🥩',
      'Balık': '🐟',
      'Tavuk': '🍗',
      'Makarna': '🍝',
      'Çorba': '🍲',
      'Kahvaltı': '🍳',
      'Döner': '🥙',
      'Kebap': '🍖',
      'Lahmacun': '🥙',
      'Pide': '🥙',
      'Köfte': '🍖',
      'Sucuk': '🥓',
      'Pastırma': '🥓',
      'Zeytin': '🫒',
      'Peynir': '🧀',
      'Yumurta': '🥚',
      'Süt': '🥛',
      'Yoğurt': '🥛',
      'Ekmek': '🍞',
      'Börek': '🥐',
      'Gözleme': '🥞',
      'Mantı': '🥟',
      'Ravioli': '🥟',
      'Sushi': '🍣',
      'Ramen': '🍜',
      'Udon': '🍜',
      'Pho': '🍜',
      'Pad Thai': '🍜',
      'Curry': '🍛',
      'Biryani': '🍛',
      'Paella': '🥘',
      'Risotto': '🍚',
      'Pilav': '🍚',
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
    addItem(product)
    toast.success(`${product.name} sepete eklendi!`)
  }, [addItem])

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

  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Şube seçilmedi</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {selectedBranch.name}
              </h1>
              <span className="text-sm text-gray-500">
                {selectedBranch.address}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/branch-select')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Şube Değiştir
              </button>
              
              <div className="relative">
                <Cart />
                {getItemCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getItemCount()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <CategoryFilter
        categories={getAvailableCategories()}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        getCategoryIcon={getCategoryIcon}
      />

      {/* Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {productsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Ürünler yükleniyor...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Ürün bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 