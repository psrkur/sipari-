'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, MapPin, Clock, AlertCircle, Building } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  isAvailable: boolean;
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

  // Şubeleri yükle
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const apiUrl = 'https://yemek5-backend.onrender.com';
        const url = `${apiUrl}/api/branches`;
        console.log('🔍 Şubeler yükleniyor...', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit',
        });
        
        console.log('🔍 Response status:', response.status);
        console.log('🔍 Response headers:', response.headers);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Şubeler yüklendi:', data);
          setBranches(data);
        } else {
          console.error('❌ Şubeler yüklenemedi:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
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

  // Menü verilerini yükle
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const apiUrl = 'https://yemek5-backend.onrender.com';
        const url = `${apiUrl}/api/qr-menu/${selectedBranch}`;
        console.log('🔍 Menü yükleniyor...', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit',
        });
        
        console.log('🔍 Menu response status:', response.status);
        console.log('🔍 Menu response headers:', response.headers);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Menü yükleme hatası:', response.status, response.statusText, errorText);
          throw new Error('Menü yüklenemedi');
        }
        
        const data = await response.json();
        console.log('✅ Menü yüklendi:', data);
        setMenuData(data);
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
      fetchMenu();
    }
  }, [selectedBranch]);

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranch(newBranchId);
    router.push(`/qr-menu/${newBranchId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Menü yükleniyor...</p>
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const getImageUrl = (image: string | null) => {
    if (!image) return '/placeholder-image.svg';
    if (image.startsWith('data:')) return image;
    if (image.startsWith('http')) return image;
    return image;
  };

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

      {/* Şube Seçimi */}
      {branches.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Building className="h-5 w-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">Şube Seçin:</label>
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

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
                Son güncelleme: {new Date(menuData.lastUpdated).toLocaleDateString('tr-TR')}
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
                                {!product.isAvailable && (
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