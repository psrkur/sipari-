'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

export default function TestRealData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('http://localhost:3001/api/real-data');
        setData(response);
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Gerçek Veri Testi</h1>
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Gerçek Veri Testi</h1>
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gerçek Veri Testi</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">API Yanıtı</h2>
          <p className="text-gray-600 mb-4">{data?.message}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Kullanıcılar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Kullanıcılar ({data?.users?.length || 0})</h3>
            <div className="space-y-2">
              {data?.users?.map((user: any) => (
                <div key={user.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium text-gray-800">{user.name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Şubeler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Şubeler ({data?.branches?.length || 0})</h3>
            <div className="space-y-2">
              {data?.branches?.map((branch: any) => (
                <div key={branch.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium text-gray-800">{branch.name}</p>
                  <p className="text-sm text-gray-600">{branch.address}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ürünler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ürünler ({data?.products?.length || 0})</h3>
            <div className="space-y-2">
              {data?.products?.map((product: any) => (
                <div key={product.id} className="border-b border-gray-200 pb-2">
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-600">₺{product.price}</p>
                  <p className="text-xs text-gray-500">Kategori: {product.categoryId}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">Sonuç</h2>
          <p className="text-blue-700">
            {data?.users?.length > 0 && data?.branches?.length > 0 && data?.products?.length > 0
              ? '✅ Gerçek veritabanı verileri başarıyla yüklendi!'
              : '❌ Veriler yüklenemedi veya veritabanı boş.'
            }
          </p>
        </div>
      </div>
    </div>
  );
} 