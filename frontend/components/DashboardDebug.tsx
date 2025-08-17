'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, RefreshCw, Database, Activity } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { getApiBaseUrl } from '@/lib/api';

interface DebugData {
  salesStats?: any;
  productSales?: any;
  dashboardStats?: any;
  dbStatus?: any;
  errors?: string[];
}

export default function DashboardDebug() {
  const [debugData, setDebugData] = useState<DebugData>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const { token } = useAuthStore();
  const API_BASE_URL = getApiBaseUrl();

  const testAllEndpoints = async () => {
    if (!token) {
      setDebugData({ errors: ['Token bulunamadı'] });
      return;
    }

    setLoading(true);
    const errors: string[] = [];
    const results: any = {};

    try {
      // Test 1: Sales Stats
      try {
        console.log('🧪 Sales Stats endpoint test ediliyor...');
        const salesResponse = await axios.get(`${API_BASE_URL}/api/admin/sales-stats?period=daily`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        results.salesStats = salesResponse.data;
        console.log('✅ Sales Stats başarılı:', salesResponse.data);
      } catch (error: any) {
        const errorMsg = `Sales Stats Hatası: ${error.response?.status} - ${error.response?.data?.error || error.message}`;
        errors.push(errorMsg);
        console.error('❌ Sales Stats hatası:', error);
      }

      // Test 2: Product Sales
      try {
        console.log('🧪 Product Sales endpoint test ediliyor...');
        const productResponse = await axios.get(`${API_BASE_URL}/api/admin/product-sales?period=daily`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        results.productSales = productResponse.data;
        console.log('✅ Product Sales başarılı:', productResponse.data);
      } catch (error: any) {
        const errorMsg = `Product Sales Hatası: ${error.response?.status} - ${error.response?.data?.error || error.message}`;
        errors.push(errorMsg);
        console.error('❌ Product Sales hatası:', error);
      }

      // Test 3: Dashboard Stats
      try {
        console.log('🧪 Dashboard Stats endpoint test ediliyor...');
        const dashboardResponse = await axios.get(`${API_BASE_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        results.dashboardStats = dashboardResponse.data;
        console.log('✅ Dashboard Stats başarılı:', dashboardResponse.data);
      } catch (error: any) {
        const errorMsg = `Dashboard Stats Hatası: ${error.response?.status} - ${error.response?.data?.error || error.message}`;
        errors.push(errorMsg);
        console.error('❌ Dashboard Stats hatası:', error);
      }

      // Test 4: Database Status
      try {
        console.log('🧪 Database Status endpoint test ediliyor...');
        const dbResponse = await axios.get(`${API_BASE_URL}/api/database-status`);
        results.dbStatus = dbResponse.data;
        console.log('✅ Database Status başarılı:', dbResponse.data);
      } catch (error: any) {
        const errorMsg = `Database Status Hatası: ${error.response?.status} - ${error.response?.data?.error || error.message}`;
        errors.push(errorMsg);
        console.error('❌ Database Status hatası:', error);
      }

    } catch (error: any) {
      errors.push(`Genel hata: ${error.message}`);
    }

    setDebugData({ ...results, errors });
    setLastUpdate(new Date().toLocaleString('tr-TR'));
    setLoading(false);
  };

  const clearData = () => {
    setDebugData({});
    setLastUpdate('');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-orange-500" />
          Dashboard Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Kontrol Butonları */}
        <div className="flex gap-2">
          <Button
            onClick={testAllEndpoints}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Test Ediliyor...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Tüm Endpoint'leri Test Et
              </>
            )}
          </Button>
          <Button
            onClick={clearData}
            variant="outline"
            disabled={loading}
          >
            Temizle
          </Button>
        </div>

        {/* Son Güncelleme */}
        {lastUpdate && (
          <div className="text-sm text-gray-500">
            Son güncelleme: {lastUpdate}
          </div>
        )}

        {/* Hatalar */}
        {debugData.errors && debugData.errors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700 text-sm">❌ Hatalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {debugData.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-100 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sales Stats Sonuçları */}
        {debugData.salesStats && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-700 text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Sales Stats Sonuçları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Period:</strong> {debugData.salesStats.period || 'daily'}</div>
                <div><strong>Total Revenue:</strong> ₺{debugData.salesStats.summary?.totalRevenue || debugData.salesStats.totalRevenue || 0}</div>
                <div><strong>Order Count:</strong> {debugData.salesStats.summary?.orderCount || debugData.salesStats.orderCount || 0}</div>
                <div><strong>Sales Array Length:</strong> {debugData.salesStats.sales?.length || debugData.salesStats.orders?.length || 0}</div>
                <div><strong>Platform Stats:</strong> {Object.keys(debugData.salesStats.platformStats || debugData.salesStats.platforms || {}).length} platform</div>
                <div><strong>Order Type Stats:</strong> {Object.keys(debugData.salesStats.orderTypeStats || debugData.salesStats.orderTypes || {}).length} tip</div>
                <div><strong>Branch Stats:</strong> {Object.keys(debugData.salesStats.branchStats || debugData.salesStats.branches || {}).length} şube</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Sales Sonuçları */}
        {debugData.productSales && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-700 text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Product Sales Sonuçları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Period:</strong> {debugData.productSales.period || 'daily'}</div>
                <div><strong>Total Products:</strong> {debugData.productSales.summary?.totalProducts || debugData.productSales.totalProducts || 0}</div>
                <div><strong>Total Quantity:</strong> {debugData.productSales.summary?.totalQuantity || debugData.productSales.totalQuantity || 0}</div>
                <div><strong>Total Revenue:</strong> ₺{debugData.productSales.summary?.totalRevenue || debugData.productSales.totalRevenue || 0}</div>
                <div><strong>Product Sales Array:</strong> {debugData.productSales.productSales?.length || debugData.productSales.products?.length || 0} ürün</div>
                <div><strong>Category Stats:</strong> {debugData.productSales.categoryStats?.length || debugData.productSales.categories?.length || 0} kategori</div>
                <div><strong>Sales Records:</strong> {debugData.productSales.salesRecords || debugData.productSales.records || 0}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Stats Sonuçları */}
        {debugData.dashboardStats && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="text-purple-700 text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Dashboard Stats Sonuçları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Sales Today:</strong> ₺{debugData.dashboardStats.sales?.today || debugData.dashboardStats.todaySales || 0}</div>
                <div><strong>Orders Total:</strong> {debugData.dashboardStats.orders?.total || debugData.dashboardStats.totalOrders || 0}</div>
                <div><strong>Customers Total:</strong> {debugData.dashboardStats.customers?.total || debugData.dashboardStats.totalCustomers || 0}</div>
                <div><strong>Products Total:</strong> {debugData.dashboardStats.products?.total || debugData.dashboardStats.totalProducts || 0}</div>
                <div><strong>Real Time Orders:</strong> {debugData.dashboardStats.realTime?.currentOrders?.length || debugData.dashboardStats.currentOrders?.length || 0}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Database Status Sonuçları */}
        {debugData.dbStatus && (
          <Card className="border-indigo-200 bg-indigo-50">
            <CardHeader>
              <CardTitle className="text-indigo-700 text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Status Sonuçları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>Orders Count:</strong> {debugData.dbStatus.counts?.orders || debugData.dbStatus.orders || 0}</div>
                <div><strong>Order Items Count:</strong> {debugData.dbStatus.counts?.orderItems || debugData.dbStatus.orderItems || 0}</div>
                <div><strong>Products Count:</strong> {debugData.dbStatus.counts?.products || debugData.dbStatus.products || 0}</div>
                <div><strong>Categories Count:</strong> {debugData.dbStatus.counts?.categories || debugData.dbStatus.categories || 0}</div>
                <div><strong>Sales Records Count:</strong> {debugData.dbStatus.counts?.salesRecords || debugData.dbStatus.salesRecords || 0}</div>
                <div><strong>Recent Orders:</strong> {debugData.dbStatus.recentOrders?.length || debugData.dbStatus.orders?.length || 0} sipariş</div>
                <div><strong>Recent Order Items:</strong> {debugData.dbStatus.recentOrderItems?.length || debugData.dbStatus.orderItems?.length || 0} ürün</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Data (Geliştirici için) */}
        {Object.keys(debugData).length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              🔍 Ham Veri (Geliştirici)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
