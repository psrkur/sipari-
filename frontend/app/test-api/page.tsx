'use client';

import { useState } from 'react';
import { API_ENDPOINTS } from '../../lib/api';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function TestApiPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fixDatabase = async () => {
    setLoading(true);
    try {
      const response = await axios.post('https://yemek5-backend.onrender.com/api/admin/fix-database');
      setResult(response.data);
      toast.success('Veritabanı düzeltildi!');
    } catch (error: any) {
      console.error('Veritabanı düzeltme hatası:', error);
      setResult({ error: error.response?.data || error.message });
      toast.error('Veritabanı düzeltilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">API Test Sayfası</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Veritabanı Düzeltme</h2>
          <button
            onClick={fixDatabase}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'İşleniyor...' : 'Veritabanını Düzelt'}
          </button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Sonuç:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 