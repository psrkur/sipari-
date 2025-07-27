'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, CreditCard, DollarSign, Printer, Plus, Minus, X } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image?: string;
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
  image?: string;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const { token, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log('POS sayfası yükleniyor...');
    console.log('Token from store:', token);
    console.log('Window opener:', window.opener);
    
    // Store'dan token'ı almayı dene
    let authToken = token;
    
    // Eğer store'dan token yoksa, localStorage'dan direkt al
    if (!authToken) {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          authToken = parsed.state?.token;
          console.log('Token from auth-storage:', authToken);
        }
      } catch (error) {
        console.error('Auth storage parse error:', error);
      }
    }
    
    console.log('Final authToken:', authToken);
    
    if (!authToken) {
      console.log('Token bulunamadı, pencere kapatılıyor...');
      toast.error('Giriş yapmanız gerekiyor');
      // Ayrı pencerede açıldıysa parent window'a mesaj gönder
      if (window.opener) {
        window.opener.postMessage({ type: 'AUTH_REQUIRED' }, '*');
        window.close();
      } else {
        router.push('/login');
      }
      return;
    }

    console.log('Token bulundu, şubeler yükleniyor...');
    fetchBranches();
  }, [token, router]);

  const fetchBranches = async () => {
    try {
      console.log('fetchBranches çağrıldı');
      // Token'ı al (store'dan veya localStorage'dan)
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error) {
          console.error('Auth storage parse error:', error);
        }
      }
      
      console.log('fetchBranches için token:', authToken);
      console.log('API endpoint:', API_ENDPOINTS.ADMIN_BRANCHES);
      
      const response = await axios.get(API_ENDPOINTS.ADMIN_BRANCHES, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('Şubeler başarıyla yüklendi:', response.data);
      setBranches(response.data);
      if (response.data.length > 0) {
        setSelectedBranch(response.data[0]);
        fetchProducts(response.data[0].id);
        fetchCategories(response.data[0].id);
      }
    } catch (error) {
      console.error('Şubeler yüklenemedi:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Error details:', (error as any).response?.data);
      }
      toast.error('Şubeler yüklenemedi');
    }
  };

  const fetchProducts = async (branchId: number) => {
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCTS(branchId));
      setProducts(response.data);
    } catch (error) {
      console.error('Ürünler yüklenemedi:', error);
      toast.error('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (branchId: number) => {
    try {
      const response = await axios.get(API_ENDPOINTS.CATEGORIES);
      setCategories(response.data);
    } catch (error) {
      console.error('Kategoriler yüklenemedi:', error);
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

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Sepet temizlendi');
  };

  const handlePayment = async (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0) {
      toast.error('Sepet boş');
      return;
    }

    if (!selectedBranch) {
      toast.error('Şube seçilmedi');
      return;
    }

    try {
      const orderData = {
        branchId: selectedBranch.id,
        items: cart.map(item => ({
          productId: item.productId,
          price: item.price,
          quantity: item.quantity
        })),
        customerInfo: {
          name: 'Kasa Müşterisi',
          phone: '0000000000',
          email: 'kasa@restaurant.com',
          address: 'Şubeden Alım'
        },
        deliveryType: 'pickup',
        paymentMethod: paymentMethod,
        notes: `Kasa Satışı - ${paymentMethod === 'cash' ? 'Nakit' : 'Kart'}`
      };

      // Token'ı al (store'dan veya localStorage'dan)
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error) {
          console.error('Auth storage parse error:', error);
        }
      }
      
      await axios.post(API_ENDPOINTS.ORDERS, orderData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      toast.success(`Sipariş başarıyla oluşturuldu! (${paymentMethod === 'cash' ? 'Nakit' : 'Kart'})`);
      clearCart();
      
      // Fiş yazdırma simülasyonu
      printReceipt();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Sipariş oluşturulamadı');
    }
  };

  const printReceipt = () => {
    const receiptContent = `
      ================================
      ${selectedBranch?.name || 'Restoran'}
      ================================
      Tarih: ${new Date().toLocaleString('tr-TR')}
      ================================
      ${cart.map(item => `
      ${item.name}
      ${item.quantity} x ₺${item.price.toFixed(2)} = ₺${(item.quantity * item.price).toFixed(2)}
      `).join('')}
      ================================
      TOPLAM: ₺${getTotalPrice().toFixed(2)}
      ================================
      Teşekkürler!
      ================================
    `;
    
    console.log('Fiş yazdırılıyor:', receiptContent);
    toast.success('Fiş yazdırıldı');
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category.name === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Kasa ekranı yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  router.push('/admin');
                }
              }}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{window.opener ? 'Kapat' : 'Admin'}</span>
            </Button>
            <h1 className="text-lg md:text-2xl font-bold text-gray-800">🏪 Kasa</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs md:text-sm">
              {selectedBranch?.name || 'Şube'}
            </Badge>
            <Badge variant="outline" className="text-xs md:text-sm">
              {cart.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Mobil Sepet Özeti - Sadece mobilde görünür */}
      <div className="md:hidden bg-white border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <span className="font-medium">Sepet: {cart.length} ürün</span>
          </div>
          <div className="text-lg font-bold text-green-600">
            ₺{getTotalPrice().toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] md:h-screen">
        {/* Ürünler Bölümü */}
        <div className="flex-1 p-2 md:p-4 overflow-y-auto">
          {/* Şube Seçimi */}
          <div className="mb-3 md:mb-4">
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Şube</label>
            <select
              value={selectedBranch?.id || ''}
              onChange={(e) => {
                const branch = branches.find(b => b.id === parseInt(e.target.value));
                setSelectedBranch(branch);
                if (branch) {
                  fetchProducts(branch.id);
                  fetchCategories(branch.id);
                }
              }}
              className="w-full p-2 md:p-3 border border-gray-300 rounded-lg text-sm md:text-lg"
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori Filtreleri */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-wrap gap-1 md:gap-2">
              <Button
                onClick={() => setSelectedCategory('all')}
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                className="text-xs md:text-sm px-3 md:px-6 py-2 md:py-3"
              >
                Tümü
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  variant={selectedCategory === category.name ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs md:text-sm px-3 md:px-6 py-2 md:py-3"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Ürün Grid - Mobil için 2 sütun, desktop için daha fazla */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300 rounded-lg bg-white"
                onClick={() => addToCart(product)}
              >
                                 <Card>
                   <CardContent className="p-3 md:p-4">
                     <h3 className="font-semibold text-sm md:text-lg mb-2 line-clamp-2">{product.name}</h3>
                     <p className="text-lg md:text-2xl font-bold text-green-600 mb-2">₺{product.price.toFixed(2)}</p>
                     <Badge variant="secondary" className="text-xs">
                       {product.category.name}
                     </Badge>
                   </CardContent>
                 </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Sepet Bölümü - Mobilde bottom sheet, desktop'ta sidebar */}
        <div className="md:w-96 bg-white border-t md:border-l border-gray-200 flex flex-col">
          {/* Desktop Sepet Header */}
          <div className="hidden md:block p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Sepet
              </h2>
              <Button
                onClick={clearCart}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                Temizle
              </Button>
            </div>
          </div>

          {/* Sepet İçeriği */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm md:text-base">Sepet boş</p>
                <p className="text-xs md:text-sm">Ürün seçmek için ürünlere tıklayın</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm md:text-base truncate">{item.name}</h3>
                      <p className="text-xs md:text-sm text-gray-600">₺{item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <Button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        size="sm"
                        variant="outline"
                        className="w-6 h-6 md:w-8 md:h-8 p-0"
                      >
                        <Minus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <span className="text-sm md:text-lg font-semibold min-w-[1.5rem] md:min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        size="sm"
                        variant="outline"
                        className="w-6 h-6 md:w-8 md:h-8 p-0"
                      >
                        <Plus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        onClick={() => removeFromCart(item.productId)}
                        size="sm"
                        variant="outline"
                        className="w-6 h-6 md:w-8 md:h-8 p-0 text-red-600"
                      >
                        <X className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toplam ve Ödeme */}
          <div className="p-2 md:p-4 border-t border-gray-200 bg-gray-50">
            <div className="mb-3 md:mb-4">
              <div className="flex justify-between items-center text-lg md:text-xl font-bold">
                <span>Toplam:</span>
                <span className="text-xl md:text-2xl text-green-600">₺{getTotalPrice().toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <Button
                onClick={() => handlePayment('cash')}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm md:text-lg py-3 md:py-4"
                disabled={cart.length === 0}
              >
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Nakit
              </Button>
              
              <Button
                onClick={() => handlePayment('card')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-lg py-3 md:py-4"
                disabled={cart.length === 0}
              >
                <CreditCard className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Kart
              </Button>

              <Button
                onClick={printReceipt}
                variant="outline"
                className="w-full text-sm md:text-lg py-3 md:py-4"
                disabled={cart.length === 0}
              >
                <Printer className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Fiş
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 