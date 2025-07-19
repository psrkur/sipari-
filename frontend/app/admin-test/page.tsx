'use client';

import { useState, useEffect } from 'react';

export default function AdminTestPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Test endpoint'lerini çağır
        const [usersRes, ordersRes, productsRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:3001/api/admin/users-test'),
          fetch('http://localhost:3001/api/admin/orders-test'),
          fetch('http://localhost:3001/api/admin/products-test'),
          fetch('http://localhost:3001/api/admin/categories-test')
        ]);

        const users = await usersRes.json();
        const orders = await ordersRes.json();
        const products = await productsRes.json();
        const categories = await categoriesRes.json();

        setData({
          users,
          orders,
          products,
          categories
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Panel Test</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Veriler yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Panel Test</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Hata</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Panel Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Kullanıcılar</h3>
            <p className="text-3xl font-bold text-blue-600">{data?.users?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Siparişler</h3>
            <p className="text-3xl font-bold text-green-600">{data?.orders?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Ürünler</h3>
            <p className="text-3xl font-bold text-purple-600">{data?.products?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Kategoriler</h3>
            <p className="text-3xl font-bold text-orange-600">{data?.categories?.length || 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kullanıcılar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Kullanıcılar</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.users?.map((user: any) => (
                <div key={user.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Siparişler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Siparişler</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.orders?.map((order: any) => (
                <div key={order.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium text-gray-800">{order.orderNumber}</p>
                  <p className="text-sm text-gray-600">₺{order.totalAmount}</p>
                  <p className="text-xs text-gray-500">{order.status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ürünler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ürünler</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.products?.map((product: any) => (
                <div key={product.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-600">₺{product.price}</p>
                  <p className="text-xs text-gray-500">{product.category?.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Kategoriler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Kategoriler</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.categories?.map((category: any) => (
                <div key={category.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium text-gray-800">{category.name}</p>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-4">Sonuç</h2>
          <p className="text-green-700">
            {data?.users?.length > 0 && data?.orders?.length > 0 && data?.products?.length > 0 && data?.categories?.length > 0
              ? '✅ Admin paneli verileri başarıyla yüklendi! Backend\'den tüm veriler geliyor.'
              : '❌ Bazı veriler eksik veya yüklenemedi.'
            }
          </p>
        </div>
      </div>
    </div>
  );
} 