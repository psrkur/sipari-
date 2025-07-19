'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, apiRequest } from '@/lib/api';

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

export default function TestProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      console.log('🔍 Test: Ürünler yükleniyor...');
      console.log('🔗 API URL:', API_ENDPOINTS.PRODUCTS(1));
      
      const response = await apiRequest(API_ENDPOINTS.PRODUCTS(1));
      console.log('✅ Test: Ürünler yüklendi:', response);
      setProducts(response);
    } catch (error) {
      console.error('❌ Test: Ürünler yüklenemedi:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Test: Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Test Hatası</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadProducts}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Test: Ürün Listesi</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Bilgileri</h2>
          <p><strong>API Base URL:</strong> {API_ENDPOINTS.PRODUCTS(1).replace('/api/products/1', '')}</p>
          <p><strong>Products URL:</strong> {API_ENDPOINTS.PRODUCTS(1)}</p>
          <p><strong>Ürün Sayısı:</strong> {products.length}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-bold text-lg mb-2">{product.name}</h3>
              <p className="text-gray-600 mb-2">{product.description}</p>
              <p className="text-green-600 font-bold">₺{product.price}</p>
              <p className="text-sm text-gray-500">Kategori: {product.category.name}</p>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Ürün bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
} 