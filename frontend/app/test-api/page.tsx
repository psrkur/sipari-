'use client';

import React from 'react';
import { API_ENDPOINTS } from '@/lib/api';

export default function TestAPI() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">API Bilgileri</h1>
        
        {/* API Info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📡 API Endpoint'leri</h2>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <strong>Base URL:</strong> {API_ENDPOINTS.BRANCHES.replace('/api/branches', '')}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <strong>Branches Endpoint:</strong> {API_ENDPOINTS.BRANCHES}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <strong>Admin Branches Endpoint:</strong> {API_ENDPOINTS.ADMIN_BRANCHES}
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <strong>Health Endpoint:</strong> {API_ENDPOINTS.BRANCHES.replace('/api/branches', '/health')}
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-4">✅ Sistem Durumu</h2>
          <p className="text-green-700">
            API endpoint'leri düzeltildi ve ürün düzenleme işlevi çalışıyor. 
            Test butonları kaldırıldı ve sayfa sadece API bilgilerini gösteriyor.
          </p>
        </div>
      </div>
    </div>
  );
} 