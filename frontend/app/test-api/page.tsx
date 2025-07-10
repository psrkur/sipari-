'use client';

import { useState, useEffect } from 'react';
import API_ENDPOINTS from '@/lib/api';

export default function TestApiPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testApiConnection = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔧 Testing API connection...');
      console.log('API URL:', API_ENDPOINTS.BRANCHES);
      
      const response = await fetch(API_ENDPOINTS.BRANCHES);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      setBranches(data);
    } catch (err: any) {
      console.error('API Test Error:', err);
      setError(err.message || 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApiConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Bağlantı Testi</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Durumu</h2>
          
          <div className="space-y-4">
            <div>
              <strong>API URL:</strong> {API_ENDPOINTS.BRANCHES}
            </div>
            
            <div>
              <strong>Durum:</strong> 
              {loading ? (
                <span className="text-yellow-600 ml-2">Test ediliyor...</span>
              ) : error ? (
                <span className="text-red-600 ml-2">Hata: {error}</span>
              ) : (
                <span className="text-green-600 ml-2">Başarılı</span>
              )}
            </div>
            
            <button 
              onClick={testApiConnection}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Test Ediliyor...' : 'Yeniden Test Et'}
            </button>
          </div>
        </div>

        {branches.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Şubeler ({branches.length})</h2>
            <div className="grid gap-4">
              {branches.map((branch: any) => (
                <div key={branch.id} className="border p-4 rounded">
                  <h3 className="font-semibold">{branch.name}</h3>
                  <p className="text-gray-600">{branch.address}</p>
                  <p className="text-sm text-gray-500">ID: {branch.id}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Hata Detayları</h2>
            <p className="text-red-700">{error}</p>
            <div className="mt-4 text-sm text-red-600">
              <p><strong>Olası Çözümler:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Backend sunucusunun çalıştığından emin olun</li>
                <li>Render'da backend'in deploy edildiğini kontrol edin</li>
                <li>CORS ayarlarını kontrol edin</li>
                <li>Environment variables'ları kontrol edin</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 