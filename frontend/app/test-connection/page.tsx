'use client';

import React, { useState, useEffect } from 'react';

export default function TestConnection() {
  const [status, setStatus] = useState<string>('Test ediliyor...');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setStatus('Bağlantı test ediliyor...');
      setError(null);
      
      // Health check
      const healthResponse = await fetch('http://localhost:3001/health');
      const healthData = await healthResponse.json();
      
      // Branches API
      const branchesResponse = await fetch('http://localhost:3001/api/branches');
      const branchesData = await branchesResponse.json();
      
      setData({
        health: healthData,
        branches: branchesData
      });
      setStatus('Bağlantı başarılı!');
    } catch (err: any) {
      setError(err.message);
      setStatus('Bağlantı hatası!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🔧 Bağlantı Test Sayfası</h1>
        
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📡 API Bağlantı Durumu</h2>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              <strong>Durum:</strong> {status}
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                <strong>Hata:</strong> {error}
              </div>
            )}
            
            {data && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Health Check:</h3>
                  <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto">
                    {JSON.stringify(data.health, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Branches API:</h3>
                  <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto">
                    {JSON.stringify(data.branches, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={testConnection}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tekrar Test Et
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">🔗 Bağlantı Bilgileri</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Backend URL:</strong> http://localhost:3001</div>
            <div><strong>Health Endpoint:</strong> http://localhost:3001/health</div>
            <div><strong>Branches Endpoint:</strong> http://localhost:3001/api/branches</div>
            <div><strong>Frontend URL:</strong> http://localhost:3000</div>
          </div>
        </div>
      </div>
    </div>
  );
} 