'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, apiRequest } from '@/lib/api';
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

export default function TableOrder() {
  const searchParams = useSearchParams();
  const [table, setTable] = useState<Table | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const tableData = JSON.parse(decodeURIComponent(dataParam));
        console.log('QR kod verisi:', tableData);
        
        if (!tableData.tableId) {
          throw new Error('QR kod verisi eksik: tableId bulunamadı');
        }
        
        loadTableInfo(tableData.tableId);
      } catch (error) {
        console.error('QR kod verisi okunamadı:', error);
        toast.error('QR kod geçersiz veya bozuk');
      }
    } else {
      console.error('QR kod verisi bulunamadı');
      toast.error('QR kod verisi bulunamadı');
    }
  }, [searchParams]);

  const loadTableInfo = async (tableId: number) => {
    try {
      setLoading(true);
      console.log('Masa bilgileri yükleniyor, tableId:', tableId);
      
      // Masa bilgilerini getir
      const tableResponse = await apiRequest(API_ENDPOINTS.TABLE_INFO(tableId));
      console.log('Masa bilgileri:', tableResponse);
      setTable(tableResponse);
      
      // Masa için ürünleri getir
      const productsResponse = await apiRequest(API_ENDPOINTS.TABLE_PRODUCTS(tableId));
      console.log('Masa ürünleri:', productsResponse);
      setProducts(productsResponse);
    } catch (error: any) {
      console.error('Masa bilgileri yüklenemedi:', error);
      if (error.message?.includes('404')) {
        toast.error('Masa bulunamadı veya aktif değil');
      } else if (error.message?.includes('400')) {
        toast.error('Bu masa aktif değil');
      } else {
        toast.error(error.message || 'Masa bilgileri yüklenemedi');
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image
        }];
      }
    });
    toast.success(`${product.name} sepete eklendi!`);
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === productId);
      
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prevCart.filter(item => item.productId !== productId);
      }
    });
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const updateCartItemNote = (productId: number, note: string) => {
    setCart(prevCart => prevCart.map(item =>
      item.productId === productId ? { ...item, note } : item
    ));
  };

  // Kategori filtreleme fonksiyonları
  const getAvailableCategories = () => {
    const categories = products.map(product => product.category.name);
    const uniqueCategories = Array.from(new Set(categories));
    return ['Tümü', ...uniqueCategories];
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Pizza': '🍕',
      'Burger': '🍔',
      'İçecek': '🥤',
      'Tatlı': '🍰',
      'Salata': '🥗',
      'Çorba': '🍲',
      'Ana Yemek': '🍖',
      'Kahvaltı': '🍳',
      'Döner': '🥙',
      'Kebap': '🍖',
      'Tümü': '🍽️'
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
    if (cart.length === 0) {
      toast.error('Sepetiniz boş');
      return;
    }

    if (!table) {
      toast.error('Masa bilgisi bulunamadı');
      return;
    }

    try {
      const orderItems = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        note: item.note || ''
      }));

      const response = await apiRequest(API_ENDPOINTS.TABLE_ORDER(table.id), {
        method: 'POST',
        body: JSON.stringify({
          items: orderItems,
          notes: notes
        })
      });

      setOrderNumber(response.order.orderNumber);
      setOrderSuccess(true);
      setCart([]);
      setNotes('');
      
      toast.success('Siparişiniz başarıyla oluşturuldu!');
    } catch (error: any) {
      console.error('Sipariş oluşturma hatası:', error);
      toast.error(error.message || 'Sipariş oluşturulamadı');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Menü Yükleniyor</h2>
          <p className="text-gray-600">Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-2xl">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Masa Bulunamadı</h1>
            <p className="text-gray-600">QR kod geçersiz veya masa aktif değil.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-2xl">
          <CardContent className="text-center p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-4">Sipariş Başarılı!</h1>
            <p className="text-gray-600 mb-6">
              Siparişiniz başarıyla oluşturuldu. Sipariş numaranız:
            </p>
            <Badge variant="outline" className="text-xl font-mono bg-green-50 border-green-200 text-green-800 px-4 py-2">
              {orderNumber}
            </Badge>
            <div className="mt-8 space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <TableIcon className="h-5 w-5 text-blue-600" />
                <span className="text-gray-700"><strong>Masa:</strong> {table.number}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                <span className="text-gray-700"><strong>Şube:</strong> {table.branch.name}</span>
              </div>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Yeni Sipariş
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <TableIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Masa {table.number}
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {table.branch.name}
                </p>
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
              <div className="flex flex-wrap gap-2">
                {getAvailableCategories().map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'
                    }`}
                  >
                    <span className="mr-2">{getCategoryIcon(category)}</span>
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {getFilteredProducts().map(product => (
                <Card key={product.id} className="group hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden rounded-t-xl">
                      <img 
                        src={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/products/${product.id}/image`}
                        alt={product.name} 
                        className="w-full h-32 sm:h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-image.png';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <Badge className="bg-orange-500 text-white text-xs">
                          {product.category.name}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="font-bold text-sm sm:text-lg text-gray-800 mb-1 sm:mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2 hidden sm:block">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                          ₺{product.price.toFixed(2)}
                        </span>
                        <Button
                          onClick={() => addToCart(product)}
                          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg sm:rounded-xl shadow-lg p-2 sm:px-3 sm:py-2"
                        >
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Ekle</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                          <img 
                            src={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/products/${item.productId}/image`}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-image.png';
                            }}
                          />
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
    </div>
  );
} 