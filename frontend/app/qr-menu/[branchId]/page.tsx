'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, MapPin, Clock, AlertCircle, Building } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isActive: boolean;
}

interface Category {
  [key: string]: Product[];
}

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
}

interface MenuData {
  branch: Branch;
  menu: Category;
  lastUpdated: string;
}

export default function QRMenuPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.branchId as string;
  
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId);

  // Şubeleri yükle - cache ile optimize edildi
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        console.log('🔍 Şubeler yükleniyor...');
        
        // Cache kontrolü
        const cacheKey = 'branches_data';
        const cachedData = sessionStorage.getItem(cacheKey);
        const cacheTime = 30 * 60 * 1000; // 30 dakika
        
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const now = Date.now();
          
          if (now - parsedData.timestamp < cacheTime) {
            console.log('✅ Şubeler cache\'den yüklendi');
            setBranches(parsedData.branches);
            return;
          }
        }
        
        // Response text'ini önce kontrol edelim
        const response = await fetch('/api/branches');
        
        console.log('🔍 Response status:', response.status);
        console.log('🔍 Response ok:', response.ok);
        console.log('🔍 Response type:', response.type);
        console.log('🔍 Response url:', response.url);
        
        // Response text'ini kontrol edelim
        const responseText = await response.text();
        console.log('🔍 Response text (first 200 chars):', responseText.substring(0, 200));
        
        if (response.ok) {
          try {
            const data = JSON.parse(responseText);
            console.log('✅ Şubeler yüklendi:', data);
            setBranches(data);
            
            // Cache'e kaydet
            sessionStorage.setItem(cacheKey, JSON.stringify({
              branches: data,
              timestamp: Date.now()
            }));
          } catch (parseError) {
            console.error('❌ JSON parse hatası:', parseError);
            console.error('❌ Response text:', responseText);
          }
        } else {
          console.error('❌ Şubeler yüklenemedi:', response.status, response.statusText);
          console.error('❌ Error response:', responseText);
        }
      } catch (error) {
        console.error('❌ Şubeler yüklenemedi (catch):', error);
        if (error instanceof Error) {
          console.error('❌ Error details:', error.message);
          console.error('❌ Error stack:', error.stack);
        }
      }
    };

    fetchBranches();
  }, []);

  // Menü verilerini yükle - cache ve debounce ile optimize edildi
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        console.log('🔍 Menü yükleniyor...', selectedBranch);
        
        // Cache kontrolü
        const cacheKey = `menu_data_${selectedBranch}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        const cacheTime = 10 * 60 * 1000; // 10 dakika
        
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          const now = Date.now();
          
          if (now - parsedData.timestamp < cacheTime) {
            console.log('✅ Menü cache\'den yüklendi');
            setMenuData(parsedData.menuData);
            setLoading(false);
            return;
          }
        }
        
        // QR menü endpoint'ini kullan
        const apiUrl = `/api/qr-menu/${selectedBranch}`;
        console.log('🔍 QR Menü API çağrısı:', apiUrl);
        
        // Response text'ini önce kontrol edelim
        const response = await fetch(apiUrl);
        
        console.log('🔍 Menu response status:', response.status);
        console.log('🔍 Menu response ok:', response.ok);
        console.log('🔍 Menu response type:', response.type);
        console.log('🔍 Menu response url:', response.url);
        
        // Response text'ini kontrol edelim
        const responseText = await response.text();
        console.log('🔍 Menu response text (first 200 chars):', responseText.substring(0, 200));
        
        if (!response.ok) {
          console.error('❌ Menü yükleme hatası:', response.status, response.statusText, responseText);
          throw new Error('Menü yüklenemedi');
        }
        
        try {
          const data = JSON.parse(responseText);
          console.log('✅ Menü yüklendi:', data);
          setMenuData(data);
          
          // Cache'e kaydet
          sessionStorage.setItem(cacheKey, JSON.stringify({
            menuData: data,
            timestamp: Date.now()
          }));
        } catch (parseError) {
          console.error('❌ Menu JSON parse hatası:', parseError);
          console.error('❌ Menu response text:', responseText);
          throw new Error('Menü verisi parse edilemedi');
        }
      } catch (err) {
        console.error('❌ Menü yükleme hatası:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Bir hata oluştu');
        }
      } finally {
        setLoading(false);
      }
    };

    if (selectedBranch) {
      // Debounce ile API çağrısını geciktir
      const timeoutId = setTimeout(fetchMenu, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedBranch]);

  // Resimleri preload et
  const preloadImages = useCallback((menuData: MenuData) => {
    const imageUrls = Object.values(menuData.menu)
      .flat()
      .filter(product => product.image)
      .map(product => product.image)
      .slice(0, 10); // İlk 10 resmi preload et

    imageUrls.forEach(url => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, []);

  useEffect(() => {
    if (menuData) {
      preloadImages(menuData);
    }
  }, [menuData, preloadImages]);

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranch(newBranchId);
    router.push(`/qr-menu/${newBranchId}`);
  };

  // Memoized formatPrice fonksiyonu
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  }, []);

  // Memoized getImageUrl fonksiyonu
  const getImageUrl = useCallback((image: string | null) => {
    if (!image) return '/placeholder-image.svg';
    if (image.startsWith('data:')) return image;
    if (image.startsWith('http')) return image;
    return image;
  }, []);

  // Memoized lastUpdated formatı
  const formattedLastUpdated = useMemo(() => {
    if (!menuData) return '';
    return new Date(menuData.lastUpdated).toLocaleDateString('tr-TR');
  }, [menuData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Menü yükleniyor...</p>
          <div className="mt-2 text-sm text-gray-500">Lütfen bekleyin</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hata</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Menü yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Geri
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">{menuData.branch.name}</h1>
              <p className="text-sm text-gray-500">Dijital Menü</p>
            </div>
            <div className="w-8"></div> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Branch Info */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{menuData.branch.name}</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  {menuData.branch.address}
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <a href={`tel:${menuData.branch.phone}`} className="hover:text-blue-600">
                    {menuData.branch.phone}
                  </a>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Son güncelleme: {formattedLastUpdated}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {Object.keys(menuData.menu).length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Menü Boş</h3>
            <p className="text-gray-600">Bu şubede henüz ürün bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(menuData.menu).map(([categoryName, products]) => (
              <div key={categoryName} className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
                </div>
                <div className="divide-y">
                  {products.map((product: Product) => (
                    <div key={product.id} className="p-6">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.svg';
                            }}
                            loading="lazy"
                            crossOrigin="anonymous"
                          />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-medium text-gray-900 mb-1">
                                {product.name}
                              </h4>
                              {product.description && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-blue-600">
                                  {formatPrice(product.price)}
                                </span>
                                                                 {!product.isActive && (
                                   <span className="text-sm text-red-600 font-medium">
                                     Mevcut Değil
                                   </span>
                                 )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Sipariş vermek için lütfen kasadan yardım alın
            </p>
            <p className="text-xs text-gray-400">
              © 2024 {menuData.branch.name} - Dijital Menü Sistemi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 