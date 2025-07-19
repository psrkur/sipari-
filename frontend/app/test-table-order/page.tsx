'use client';

import React, { useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function TestTableOrder() {
  const [tableId, setTableId] = useState('1');
  const [branchId, setBranchId] = useState('3');
  const [testResult, setTestResult] = useState('');

  const testTableInfo = async () => {
    try {
      setTestResult('Masa bilgisi test ediliyor...');
      const response = await apiRequest(API_ENDPOINTS.TABLE_INFO(parseInt(tableId)));
      setTestResult(`✅ Masa bilgisi başarılı: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ Masa bilgisi hatası: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testTableOrder = async () => {
    try {
      setTestResult('Masa siparişi test ediliyor...');
      const orderData = {
        items: [
          {
            productId: 1,
            quantity: 1,
            note: 'Test sipariş'
          }
        ],
        notes: 'Test masa siparişi'
      };

      const response = await apiRequest(API_ENDPOINTS.TABLE_ORDER(parseInt(tableId)), {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      setTestResult(`✅ Masa siparişi başarılı: ${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ Masa siparişi hatası: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testProducts = async () => {
    try {
      setTestResult('Ürünler test ediliyor...');
      const response = await apiRequest(API_ENDPOINTS.PRODUCTS(parseInt(branchId)));
      setTestResult(`✅ Ürünler başarılı (${response.length} ürün): ${JSON.stringify(response.slice(0, 2), null, 2)}`);
    } catch (error) {
      setTestResult(`❌ Ürünler hatası: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Masa Sipariş Test Sayfası</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Parametreleri</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Masa ID:</label>
                <Input
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Branch ID:</label>
                <Input
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  placeholder="3"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Butonları</h2>
            <div className="space-y-3">
              <Button onClick={testTableInfo} className="w-full">
                Masa Bilgisi Test Et
              </Button>
              <Button onClick={testProducts} className="w-full">
                Ürünler Test Et
              </Button>
              <Button onClick={testTableOrder} className="w-full">
                Masa Siparişi Test Et
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Sonucu</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
            {testResult || 'Test sonucu burada görünecek...'}
          </pre>
        </div>
      </div>
    </div>
  );
} 