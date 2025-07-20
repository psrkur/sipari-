'use client';

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, apiRequest } from '@/lib/api';

export default function TestAPI() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [branchesStatus, setBranchesStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_ENDPOINTS.BRANCHES.replace('/api/branches', '')}/health`);
      const data = await response.json();
      setHealthStatus({ status: response.status, data });
    } catch (err) {
      setError(`Health check hatası: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(API_ENDPOINTS.BRANCHES);
      setBranchesStatus({ success: true, data });
    } catch (err) {
      setBranchesStatus({ success: false, error: err });
      setError(`Branches API hatası: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testHealth();
    testBranches();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🔧 API Test Sayfası</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health Check */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🏥 Health Check</h2>
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            ) : healthStatus ? (
              <div className="space-y-2">
                <div className={`p-3 rounded-lg ${healthStatus.status === 200 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  Status: {healthStatus.status}
                </div>
                <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(healthStatus.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500">Test edilmedi</div>
            )}
          </div>

          {/* Branches API */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🏢 Branches API</h2>
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            ) : branchesStatus ? (
              <div className="space-y-2">
                <div className={`p-3 rounded-lg ${branchesStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {branchesStatus.success ? 'Başarılı' : 'Hata'}
                </div>
                <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(branchesStatus.data || branchesStatus.error, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500">Test edilmedi</div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Hata:</strong> {error}
          </div>
        )}

        {/* API Info */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📡 API Bilgileri</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Base URL:</strong> {API_ENDPOINTS.BRANCHES.replace('/api/branches', '')}</div>
            <div><strong>Branches Endpoint:</strong> {API_ENDPOINTS.BRANCHES}</div>
            <div><strong>Health Endpoint:</strong> {API_ENDPOINTS.BRANCHES.replace('/api/branches', '/health')}</div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={testHealth}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Health Check Test Et
          </button>
          <button
            onClick={testBranches}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Branches API Test Et
          </button>
        </div>
      </div>
    </div>
  );
} 