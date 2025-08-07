'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, apiRequest, handleImageError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import OrderTracking from './order-tracking';
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
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart';

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
  imagePath?: string;
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

// Ürünleri kategorilere göre gruplandır


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
  const [showOrderTracking, setShowOrderTracking] = useState(false);

  // Cart store'dan clearCart fonksiyonunu al
  const { clearCart } = useCartStore();

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

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Adet 0 veya daha az ise ürünü sepetten kaldır
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

  const updateCartItemNote = (productId: number, note: string) => {
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, note }
        : item
    ));
  };

  const getAvailableCategories = () => {
    // Products array kontrolü ekle
    if (!Array.isArray(products) || products.length === 0) {
      return ['Tümü'];
    }
    
    const categories = Array.from(new Set(products.map(p => p.category?.name || 'Diğer')));
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

  const groupProductsByCategory = useCallback((products: Product[]) => {
    return products.reduce((acc, product) => {
      const categoryName = product.category?.name || 'Diğer';
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, []);

  const getCategoryIcon = useCallback((category: string) => {
    const icons: Record<string, string> = {
      // Ana Yemekler
      'Ana Yemek': '🍽️',
      'Ana Yemekler': '🍽️',
      'Yemek': '🍽️',
      'Yemekler': '🍽️',
      'Pilav': '🍚',
      'Makarna': '🍝',
      'Noodle': '🍜',
      
      // Pizza ve İtalyan
      'Pizza': '🍕',
      'İtalyan': '🍕',
      'Margherita': '🍕',
      'Pepperoni': '🍕',
      'Quattro Stagioni': '🍕',
      'Quattro Formaggi': '🍕',
      'Hawaiian': '🍕',
      'BBQ Chicken': '🍕',
      'Supreme': '🍕',
      'Vegetarian': '🍕',
      'Mushroom': '🍕',
      'Seafood': '🍕',
      'Calzone': '🍕',
      'Neapolitan': '🍕',
      'Sicilian': '🍕',
      'Chicago': '🍕',
      'New York': '🍕',
      'Detroit': '🍕',
      'Pizza Napoletana': '🍕',
      'Pizza Romana': '🍕',
      'Pizza Siciliana': '🍕',
      'Pizza Bianca': '🍕',
      'Pizza Marinara': '🍕',
      'Pizza Diavola': '🍕',
      'Pizza Capricciosa': '🍕',
      'Pizza Funghi': '🍕',
      'Pizza Prosciutto': '🍕',
      'Pizza Salsiccia': '🍕',
      'Pizza Tonno': '🍕',
      'Pizza Frutti di Mare': '🍕',
      'Pizza Ortolana': '🍕',
      'Pizza Vegetariana': '🍕',
      'Pizza Quattro Stagioni': '🍕',
      'Pizza Quattro Formaggi': '🍕',
      'Pizza Margherita': '🍕',
      'Pizza Pepperoni': '🍕',
      'Pizza Hawaii': '🍕',
      'Pizza BBQ': '🍕',
      'Pizza Supreme': '🍕',
      'Pizza Seafood': '🍕',
      'Pizza Calzone': '🍕',
      'Pizza Neapolitan': '🍕',
      'Pizza Sicilian': '🍕',
      'Pizza Chicago': '🍕',
      'Pizza New York': '🍕',
      'Pizza Detroit': '🍕',
      
      // Burger ve Fast Food
      'Burger': '🍔',
      'Hamburger': '🍔',
      'Fast Food': '🍔',
      'Sandviç': '🥪',
      'Soğuk Sandviç': '🥪',
      'Sıcak Sandviç': '🥪',
      'Tost': '🥪',
      'Wrap': '🌯',
      'Wraplar': '🌯',
      'Döner': '🥙',
      'Kebap': '🍖',
      'Izgara': '🔥',
      'Köfte': '🍖',
      'Şiş': '🍖',
      'Adana': '🍖',
      'Urfa': '🍖',
      
      // Yan Ürünler
      'Yan Ürün': '🍟',
      'Yan Ürünler': '🍟',
      'Patates': '🍟',
      'Cips': '🍟',
      'Kızartma': '🍟',
      'Soğan Halkası': '🍟',
      'Nugget': '🍗',
      
      // İçecekler
      'İçecek': '🥤',
      'İçecekler': '🥤',
      'Teneke İçecek': '🥤',
      'Kola': '🥤',
      'Fanta': '🥤',
      'Sprite': '🥤',
      'Su': '💧',
      'Maden Suyu': '💧',
      'Ayran': '🥛',
      'Süt': '🥛',
      'Kahve': '☕',
      'Çay': '🫖',
      'Türk Çayı': '🫖',
      'Yeşil Çay': '🫖',
      'Meyve Suyu': '🧃',
      'Portakal Suyu': '🧃',
      'Elma Suyu': '🧃',
      'Smoothie': '🥤',
      'Milkshake': '🥤',
      'Limonata': '🍋',
      'Ice Tea': '🫖',
      'Soğuk Çay': '🫖',
      
      // Tatlılar
      'Tatlı': '🍰',
      'Tatlılar': '🍰',
      'Dessert': '🍰',
      'Pasta Tatlı': '🎂',
      'Kek': '🎂',
      'Cheesecake': '🍰',
      'Tiramisu': '🍰',
      'Dondurma': '🍦',
      'Ice Cream': '🍦',
      'Çikolata': '🍫',
      'Baklava': '🍯',
      'Künefe': '🍯',
      'Kazandibi': '🍯',
      'Sütlaç': '🍮',
      'Kemalpaşa': '🍮',
      'Külah': '🍦',
      'Cookie': '🍪',
      'Kurabiye': '🍪',
      'Brownie': '🍫',
      'Muffin': '🧁',
      'Cupcake': '🧁',
      
      // Salatalar
      'Salata': '🥗',
      'Salatalar': '🥗',
      'Çoban Salata': '🥗',
      'Sezar Salata': '🥗',
      'Gavurdağı': '🥗',
      'Mevsim Salata': '🥗',
      'Yeşil Salata': '🥗',
      
      // Çorbalar
      'Çorba': '🍲',
      'Çorbalar': '🍲',
      'Mercimek Çorba': '🍲',
      'Tavuk Çorba': '🍲',
      'Domates Çorba': '🍲',
      'Mantar Çorba': '🍲',
      'Ezogelin': '🍲',
      'Yayla': '🍲',
      'Düğün': '🍲',
      
      // Kahvaltı
      'Kahvaltı': '🍳',
      'Kahvaltılık': '🍳',
      'Omlet': '🍳',
      'Menemen': '🍳',
      'Sucuk': '🥓',
      'Pastırma': '🥓',
      'Peynir': '🧀',
      'Zeytin': '🫒',
      'Bal': '🍯',
      'Reçel': '🍯',
      'Kaymak': '🥛',
      'Tereyağı': '🧈',
      'Ekmek': '🥖',
      'Simit': '🥨',
      'Poğaça': '🥐',
      'Börek': '🥐',
      
      // Deniz Ürünleri
      'Deniz Ürünleri': '🦐',
      'Balık': '🐟',
      'Karides': '🦐',
      'Kalamar': '🦑',
      'Midye': '🦪',
      'Sushi': '🍣',
      'Sashimi': '🍣',
      
      // Et Ürünleri
      'Et': '🥩',
      'Dana': '🥩',
      'Kuzu': '🥩',
      'Tavuk Et': '🍗',
      'Hindi': '🦃',
      'Kuzu Pirzola': '🥩',
      'Dana Pirzola': '🥩',
      'Tavuk Pirzola': '🍗',
      'Tavuk Göğsü': '🍗',
      'Tavuk But': '🍗',
      'Tavuk Kanat': '🍗',
      
      // Vejetaryen
      'Vejetaryen': '🥬',
      'Vegan': '🥬',
      'Sebze': '🥬',
      'Mercimek Yemek': '🫘',
      'Nohut': '🫘',
      'Fasulye': '🫘',
      
      // Özel Kategoriler
      'Özel': '⭐',
      'Önerilen': '⭐',
      'Popüler': '🔥',
      'Yeni': '🆕',
      'Kampanya': '🎉',
      'Fırsat': '🎯',
      'Çocuk': '👶',
      'Diyet': '🥗',
      'Glutensiz': '🌾',
      'Laktozsuz': '🥛',
      
      // Diğer
      'Diğer': '🍽️',
      'Genel': '🍽️',
      'Çeşitli': '🍽️'
    };
    return icons[category] || '🍽️';
  }, []);

  const getFilteredProducts = () => {
    // Products array kontrolü ekle
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }
    
    if (selectedCategory === 'Tümü') {
      return products;
    }
    return products.filter(product => product.category?.name === selectedCategory);
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

      // Sepeti temizle - hem local state hem de store'u temizle
      setCart([]);
      clearCart(); // Store'daki sepeti de temizle
      setNotes('');
      setShowCart(false);
      
      // Sipariş başarılı olduktan sonra sayfayı kapat
      toast.success('Siparişiniz başarıyla alındı! Sayfa kapatılıyor...');
      
      // 3 saniye sonra sayfayı kapat
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.close();
          // Eğer window.close() çalışmazsa, ana sayfaya yönlendir
          window.location.href = '/';
        }
      }, 3000);
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

  const grouped = groupProductsByCategory(products);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Responsive Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo ve Masa Bilgisi */}
            <div className="flex items-center space-x-4 lg:space-x-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TableIcon className="text-white text-sm sm:text-xl" />
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Masa Siparişi
                </h1>
              </div>
              
              {/* Masa/Şube Bilgisi */}
              <div className="hidden lg:block">
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm border-2 border-orange-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-700">
                  <Building className="h-4 w-4" />
                  <span>{table?.branch.name || (branchId ? `Şube ${branchId}` : 'Şube Bilgisi Yok')}</span>
                  {table && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                      Masa {table.number}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              {/* Sipariş Takip Butonu */}
              {table && (
                <button 
                  onClick={() => setShowOrderTracking(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">📱 Sipariş Takibi</span>
                  <span className="sm:hidden">📱</span>
                </button>
              )}
              
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
            </div>

            {/* Mobil Menü Butonu */}
            <div className="flex md:hidden items-center space-x-2">
              {/* Mobil Sipariş Takip Butonu */}
              {table && (
                <button 
                  onClick={() => setShowOrderTracking(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-2 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
                >
                  📱
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
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <ChefHat className="text-white text-lg sm:text-xl" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {table?.branch.name || (branchId ? `Şube ${branchId}` : 'Şube')} - Menü
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    {table ? `Masa ${table.number}` : 'Masa siparişi'}
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
          <div className="space-y-8 sm:space-y-12">
            {Object.entries(grouped)
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
                              onError={handleImageError}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          </div>
                        )}
                        
                        {/* Ürün adı - tam yazılacak */}
                        <h5 className="text-sm sm:text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-2 sm:mb-3 leading-tight">
                          {product.name}
                        </h5>
                        
                        {/* Açıklama - kısaltılacak */}
                        <p className="text-xs sm:text-base text-gray-600 mb-3 sm:mb-4 flex-grow line-clamp-2">
                          {truncateDescription(product.description)}
                        </p>
                        
                        {/* Alt kısım - kategori, fiyat ve buton */}
                        <div className="mt-auto">
                          <div className="flex justify-between items-center mb-2 sm:mb-3">
                            <span className="text-xs text-gray-500 bg-orange-100 px-2 sm:px-3 py-1 rounded-full font-semibold">
                              {product.category.name}
                            </span>
                            
                            {/* Fiyat - alt kısma taşındı */}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
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

      {/* Sipariş Takip Modalı */}
      {showOrderTracking && table && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">📱 Sipariş Takibi</h2>
              <button
                onClick={() => setShowOrderTracking(false)}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>
            
            <OrderTracking tableId={table.id.toString()} />
          </div>
        </div>
      )}
    </div>
  );
} 