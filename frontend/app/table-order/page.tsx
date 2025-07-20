'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, apiRequest, handleImageError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface Table {
  id: number;
  number: string;
  branchId: number;
  isActive: boolean;
  branch: {
    id: number;
    name: string;
  };
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: {
    id: number;
    name: string;
  };
}

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  note?: string;
}

// Açıklamayı kısalt fonksiyonu
const truncateDescription = (text: string, maxLength: number = 60) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export default function TableOrder() {
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branch');
  const tableId = searchParams.get('table');
  const qrData = searchParams.get('data');

  const [table, setTable] = useState<Table | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    console.log('🔍 URL Parametreleri:', { tableId, branchId, qrData });
    console.log('🔗 API Base URL:', API_ENDPOINTS.PRODUCTS(1).replace('/api/products/1', ''));
    
    if (tableId) {
      console.log('🍽️ Table ID ile yükleme:', tableId);
      loadTableInfo(parseInt(tableId));
    } else if (branchId) {
      console.log('🏢 Branch ID ile yükleme:', branchId);
      // Branch ID ile direkt ürünleri yükle, masa bilgisi olmadan
      loadProducts(parseInt(branchId));
      setLoading(false);
    } else if (qrData) {
      console.log('📱 QR kod verisi ile yükleme:', qrData);
      try {
        const decodedData = JSON.parse(decodeURIComponent(qrData));
        console.log('📱 Decoded QR data:', decodedData);
        
        if (decodedData.tableId) {
          console.log('🍽️ QR kod table ID ile yükleme:', decodedData.tableId);
          loadTableInfo(decodedData.tableId);
        } else {
          console.log('❌ QR kod verisinde tableId bulunamadı');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ QR kod verisi parse edilemedi:', error);
        setLoading(false);
      }
    } else {
      // Eğer hiçbir parametre yoksa, kullanıcıya uyarı göster
      console.log('⚠️ Parametre bulunamadı, uyarı sayfası gösteriliyor...');
      setLoading(false);
    }
  }, [tableId, branchId, qrData]);

  const loadTableInfo = async (tableId: number) => {
    try {
      console.log('🔍 Masa bilgisi yükleniyor, tableId:', tableId);
      console.log('🔗 API URL:', API_ENDPOINTS.TABLE_INFO(tableId));
      
      const response = await apiRequest(API_ENDPOINTS.TABLE_INFO(tableId));
      console.log('✅ Masa bilgisi yüklendi:', response);
      setTable(response);
      await loadProducts(response.branchId);
    } catch (error) {
      console.error('❌ Masa bilgisi yüklenemedi:', error);
      console.error('❌ Hata detayı:', error instanceof Error ? error.message : String(error));
      toast.error('Masa bilgisi yüklenemedi');
      setLoading(false);
    }
  };

  const loadProducts = async (branchId: number) => {
    try {
      console.log('🔍 Ürünler yükleniyor, branchId:', branchId);
      console.log('🔗 API URL:', API_ENDPOINTS.PRODUCTS(branchId));
      
      const response = await apiRequest(API_ENDPOINTS.PRODUCTS(branchId));
      console.log('✅ Ürünler yüklendi:', response);
      
      // Kategori bilgilerini kontrol et
      console.log('📊 Kategori analizi:');
      const categoryCounts: Record<string, number> = {};
      response.forEach((product: any) => {
        const categoryName = product.category?.name || 'Kategori Yok';
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
        console.log(`  - ${product.name}: ${categoryName}`);
      });
      console.log('📈 Kategori dağılımı:', categoryCounts);
      
      setProducts(response);
    } catch (error) {
      console.error('❌ Ürünler yüklenemedi:', error);
      console.error('❌ Hata detayı:', error instanceof Error ? error.message : String(error));
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
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
        image: product.image
      }]);
    }
    
    toast.success(`${product.name} sepete eklendi`);
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const updateCartItemNote = (productId: number, note: string) => {
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, note }
        : item
    ));
  };

  const getAvailableCategories = () => {
    const categories = Array.from(new Set(products.map(p => p.category.name)));
    // Kategorileri öncelik sırasına göre sırala
    const priorityCategories = ['İçecek', 'Soğuk Sandviç', 'Ana Yemek', 'Pizza', 'Burger', 'Tatlı'];
    const sortedCategories = categories.sort((a, b) => {
      const aIndex = priorityCategories.indexOf(a);
      const bIndex = priorityCategories.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    return ['Tümü', ...sortedCategories];
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Ana Yemek': '🍽️',
      'Pizza': '🍕',
      'Burger': '🍔',
      'Yan Ürün': '🍟',
      'İçecek': '🥤',
      'Teneke İçecek': '🥤',
      'Tatlı': '🍰',
      'Döner': '🥙',
      'Kebap': '🍖',
      'Izgara': '🔥',
      'Salata': '🥗',
      'Çorba': '🍲',
      'Kahvaltı': '🍳',
      'Soğuk Sandviç': '🥪',
      'Sandviç': '🥪',
      'Diğer': '🍽️'
    };
    return icons[category] || '🍽️';
  };

  const getFilteredProducts = () => {
    if (selectedCategory === 'Tümü') {
      return products;
    }
    return products.filter(product => product.category.name === selectedCategory);
  };

  const handlePlaceOrder = async () => {
    console.log('🔍 Sipariş tamamlama başlatıldı');
    console.log('📦 Sepet içeriği:', cart);
    console.log('🏠 Masa bilgisi:', table);
    console.log('🏢 Branch ID:', branchId);
    
    if (cart.length === 0) {
      toast.error('Sepetiniz boş');
      return;
    }

    // Eğer hem masa hem de branch bilgisi yoksa, kullanıcıya uyarı ver
    if (!table && !branchId) {
      console.log('❌ Masa ve branch bilgisi yok!');
      toast.error('Masa veya şube bilgisi bulunamadı. Lütfen doğru URL ile erişin.');
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          note: item.note || ''
        })),
        notes: notes
      };

      console.log('📤 Gönderilecek sipariş verisi:', orderData);

      if (table) {
        // Masa siparişi
        console.log('🍽️ Masa siparişi gönderiliyor, masa ID:', table.id);
        console.log('🔗 API URL:', API_ENDPOINTS.TABLE_ORDER(table.id));
        
        const response = await apiRequest(API_ENDPOINTS.TABLE_ORDER(table.id), {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
        
        console.log('✅ Masa siparişi başarılı:', response);
        toast.success('Masa siparişiniz başarıyla alındı!');
      } else if (branchId) {
        // Normal sipariş (masa olmadan)
        console.log('🚚 Normal sipariş gönderiliyor, branch ID:', branchId);
        console.log('🔗 API URL:', API_ENDPOINTS.ORDERS);
        
        const response = await apiRequest(API_ENDPOINTS.ORDERS, {
          method: 'POST',
          body: JSON.stringify({
            ...orderData,
            branchId: parseInt(branchId),
            orderType: 'DELIVERY'
          })
        });
        
        console.log('✅ Normal sipariş başarılı:', response);
        toast.success('Siparişiniz başarıyla alındı!');
      }

      setCart([]);
      setNotes('');
      setShowCart(false);
    } catch (error) {
      console.error('❌ Sipariş hatası:', error);
      console.error('❌ Hata detayı:', error instanceof Error ? error.message : String(error));
      toast.error('Sipariş alınamadı');
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setShowProductModal(true);
  };

  const handleAddToCartFromModal = () => {
    if (selectedProduct) {
      for (let i = 0; i < quantity; i++) {
        addToCart(selectedProduct);
      }
      setShowProductModal(false);
      setSelectedProduct(null);
      setQuantity(1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Eğer masa ve branch bilgisi yoksa uyarı göster
  if (!table && !branchId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">URL Parametresi Eksik</h2>
            <p className="text-gray-600 mb-6">
              Masa veya şube bilgisi bulunamadı. Lütfen doğru URL ile erişin.
            </p>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p className="font-semibold mb-2">🍽️ Masa siparişi için:</p>
                <code className="bg-gray-100 px-3 py-2 rounded-lg block text-center font-mono">
                  /table-order?table=1
                </code>
              </div>
              <div>
                <p className="font-semibold mb-2">🏢 Şube siparişi için:</p>
                <code className="bg-gray-100 px-3 py-2 rounded-lg block text-center font-mono">
                  /table-order?branch=3
                </code>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                💡 İpucu: QR kod ile masa siparişi veriyorsanız, QR kodunuzu tekrar tarayın.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                🔗 QR kodlar otomatik olarak doğru URL'yi oluşturur.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-orange-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <TableIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">Masa Siparişi</h1>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {table?.branch.name || (branchId ? `Şube ${branchId}` : 'Şube Bilgisi Yok')}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCart(!showCart)}
                className="relative bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Sepet
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Ürünler Bölümü */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-orange-600" />
                Menü
              </h2>
              <p className="text-gray-600">Lezzetli yemeklerimizi keşfedin</p>
            </div>

            {/* Kategori Filtreleme */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Menu className="h-5 w-5 text-orange-600" />
                  Kategoriler
                </h3>
                <span className="text-sm text-gray-600">
                  {getFilteredProducts().length} ürün bulundu
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {getAvailableCategories().map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25'
                        : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 hover:shadow-md'
                    }`}
                  >
                    <span className="mr-2 text-lg">{getCategoryIcon(category)}</span>
                    {category}
                    {selectedCategory === category && (
                      <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                        {getFilteredProducts().length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {getFilteredProducts().length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg">
                    <div className="text-6xl mb-4">🍽️</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {selectedCategory === 'Tümü' ? 'Henüz ürün bulunmuyor' : `${selectedCategory} kategorisinde ürün bulunamadı`}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {selectedCategory === 'Tümü' 
                        ? 'Bu şubede henüz ürün eklenmemiş.' 
                        : 'Bu kategoride henüz ürün bulunmuyor. Diğer kategorileri deneyin.'
                      }
                    </p>
                    {selectedCategory !== 'Tümü' && (
                      <button
                        onClick={() => setSelectedCategory('Tümü')}
                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-200"
                      >
                        Tüm Ürünleri Gör
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                getFilteredProducts().map(product => (
                  <div key={product.id} className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 bg-white/80 backdrop-blur-sm flex flex-col h-full cursor-pointer rounded-lg shadow-md" onClick={() => handleProductClick(product)}>
                    <CardContent className="p-4 flex flex-col h-full">
                      {/* Kategori etiketi - üst kısımda */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-600 bg-gradient-to-r from-orange-100 to-red-100 px-2 py-1 rounded-full font-semibold border border-orange-200">
                          {getCategoryIcon(product.category.name)} {product.category.name}
                        </span>
                        <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                          ₺{product.price.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Ürün adı - tam yazılacak */}
                      <h3 className="font-bold text-sm sm:text-lg text-gray-800 mb-2 sm:mb-3 group-hover:text-orange-600 transition-colors leading-tight">
                        {product.name}
                      </h3>
                      
                      {/* Açıklama - kısaltılacak */}
                      <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 flex-grow line-clamp-2">
                        {truncateDescription(product.description)}
                      </p>
                      
                      {/* Sepete Ekle Butonu */}
                      <div className="mt-auto">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg sm:rounded-xl shadow-lg p-2 sm:px-3 sm:py-2 transform hover:scale-105 transition-all duration-200"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Sepete Ekle</span>
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sepet Bölümü */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShoppingCart className="h-6 w-6 text-orange-600" />
                  Sepetiniz
                  {cart.length > 0 && (
                    <Badge className="bg-orange-500 text-white">
                      {cart.reduce((total, item) => total + item.quantity, 0)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFromCart(item.productId)}
                                  className="h-6 w-6 p-0 rounded-full"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="font-semibold text-gray-700">{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addToCart({ id: item.productId, name: item.name, price: item.price, description: '', image: item.image, category: { id: 0, name: '' } })}
                                  className="h-6 w-6 p-0 rounded-full"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="font-bold text-orange-600">₺{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <Input
                              type="text"
                              placeholder="Not ekle..."
                              value={item.note || ''}
                              onChange={e => updateCartItemNote(item.productId, e.target.value)}
                              className="mt-2 text-sm"
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
                      
                      <Input
                        placeholder="Sipariş notu (opsiyonel)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full"
                      />
                      
                      <Button
                        onClick={handlePlaceOrder}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg"
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Siparişi Tamamla
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

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
              {selectedProduct.image && (
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={API_ENDPOINTS.IMAGE_URL(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-64 sm:h-80 object-cover"
                    crossOrigin="anonymous"
                    onError={handleImageError}
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
                    {selectedProduct.category.name}
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
    </div>
  );
} 