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
    <div className="container mx-auto px-2 sm:px-4 py-4 pb-28 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b mb-4">
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

      {/* Sepet Listesi */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 max-w-lg mx-auto">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> Sepetiniz
        </h2>
        {cart.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Sepetiniz boş</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {cart.map(item => (
              <li key={item.productId} className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="ml-2 text-gray-500">x{item.quantity}</span>
                  <span className="ml-2 text-blue-600 font-semibold">₺{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <button
                  className="ml-4 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                  onClick={() => removeFromCart(item.productId)}
                  aria-label="Ürünü çıkar"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ürünler */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-24">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
            <img src={product.image} alt={product.name} className="w-24 h-24 object-cover rounded mb-2" />
            <div className="font-semibold text-center text-base sm:text-lg mb-1">{product.name}</div>
            <div className="text-blue-600 font-bold text-lg mb-2">₺{product.price.toFixed(2)}</div>
            <button
              className="w-full bg-blue-600 text-white rounded py-2 mt-auto hover:bg-blue-700 transition"
              onClick={() => addToCart(product)}
            >
              Sepete Ekle
            </button>
          </div>
        ))}
      </div>

      {/* Sepet ve Sipariş Özeti - Mobilde sabit alt bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-between items-center z-50 sm:static sm:shadow-none sm:border-0">
        <span className="font-bold">Toplam: ₺{getTotalPrice().toFixed(2)}</span>
        <button className="bg-green-600 text-white rounded px-4 py-2" onClick={handlePlaceOrder}>
          Siparişi Tamamla
        </button>
      </div>
    </div>
  );
} 