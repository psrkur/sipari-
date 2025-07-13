'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  CheckCircle,
  Table as TableIcon,
  Building,
  Menu
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
        quantity: item.quantity
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Masa bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Masa Bulunamadı</h1>
          <p className="text-gray-600">QR kod geçersiz veya masa aktif değil.</p>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-600">Sipariş Başarılı!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Siparişiniz başarıyla oluşturuldu. Sipariş numaranız:
            </p>
            <Badge variant="outline" className="text-lg font-mono">
              {orderNumber}
            </Badge>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-gray-500">
                <strong>Masa:</strong> {table.number}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Şube:</strong> {table.branch.name}
              </p>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-6 w-full"
            >
              Yeni Sipariş
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TableIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">Masa {table.number}</h1>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {table.branch.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
              <Badge variant="secondary">
                {cart.reduce((total, item) => total + item.quantity, 0)} ürün
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ürünler */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Menu className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Menü</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={product.image ? API_ENDPOINTS.IMAGE_URL(product.image) : '/placeholder-food.jpg'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-food.jpg';
                      }}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.description}</p>
                        <Badge variant="outline" className="mt-1">
                          {product.category.name}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{product.price.toFixed(2)} ₺</p>
                        <Button
                          size="sm"
                          onClick={() => addToCart(product)}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sepet */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Sepet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Sepetiniz boş
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={item.image ? API_ENDPOINTS.IMAGE_URL(item.image) : '/placeholder-food.jpg'}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-food.jpg';
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.price.toFixed(2)} ₺</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToCart({
                              id: item.productId,
                              name: item.name,
                              price: item.price,
                              image: item.image,
                              description: '',
                              category: { id: 0, name: '' }
                            })}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold">Toplam:</span>
                        <span className="font-bold text-lg">{getTotalPrice().toFixed(2)} ₺</span>
                      </div>
                      
                      <div className="space-y-3">
                        <textarea
                          placeholder="Sipariş notu (opsiyonel)"
                          value={notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md resize-none"
                          rows={3}
                        />
                        
                        <Button 
                          onClick={handlePlaceOrder}
                          className="w-full"
                          size="lg"
                        >
                          Sipariş Ver
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 