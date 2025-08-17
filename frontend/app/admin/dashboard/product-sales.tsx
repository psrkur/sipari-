'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Tag,
  Star
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { getApiBaseUrl } from '@/lib/api';

interface ProductSalesData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalProducts: number;
    totalQuantity: number;
    totalRevenue: number;
  };
  productSales: Array<{
    name: string;
    category: string;
    totalQuantity: number;
    totalRevenue: number;
    averagePrice: number;
    orderCount: number;
  }>;
  categoryStats: Array<{
    name: string;
    totalQuantity: number;
    totalRevenue: number;
    productCount: number;
  }>;
  salesRecords: number;
}

export default function ProductSales() {
  const [data, setData] = useState<ProductSalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { token } = useAuthStore();
  const API_BASE_URL = getApiBaseUrl();

  const loadProductSales = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/admin/product-sales?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error: any) {
      console.error('❌ Ürün satış istatistikleri yüklenemedi:', error);
      toast.error('Ürün satış istatistikleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadProductSales();
    }
  }, [token, period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPeriodText = () => {
    switch (period) {
      case 'daily': return 'Günlük';
      case 'weekly': return 'Haftalık';
      case 'monthly': return 'Aylık';
      default: return 'Günlük';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-2">Ürün satış istatistikleri yükleniyor...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Ürün satış verisi bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zaman Aralığı Seçimi */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ürün Satış İstatistikleri</h2>
          <p className="text-gray-600">{getPeriodText()} rapor - {formatDate(data.startDate)} - {formatDate(data.endDate)}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={period === 'daily' ? 'default' : 'outline'}
            onClick={() => setPeriod('daily')}
            size="sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Günlük
          </Button>
          <Button
            variant={period === 'weekly' ? 'default' : 'outline'}
            onClick={() => setPeriod('weekly')}
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Haftalık
          </Button>
          <Button
            variant={period === 'monthly' ? 'default' : 'outline'}
            onClick={() => setPeriod('monthly')}
            size="sm"
          >
            <PieChart className="h-4 w-4 mr-2" />
            Aylık
          </Button>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ürün Çeşidi</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Farklı ürün satıldı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Satış Adedi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalQuantity}</div>
            <p className="text-xs text-muted-foreground">
              Toplam ürün adedi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Ürün satışlarından
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kategori İstatistikleri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Kategori Bazında Satışlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.categoryStats.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Tag className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{category.name}</h4>
                    <p className="text-sm text-gray-500">{category.productCount} ürün çeşidi</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{category.totalQuantity} adet</div>
                  <div className="text-sm text-gray-500">{formatCurrency(category.totalRevenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ürün Satış Listesi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2" />
            En Çok Satan Ürünler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.productSales.slice(0, 10).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-green-600">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{product.name}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{product.category}</Badge>
                      <span className="text-sm text-gray-500">{product.orderCount} sipariş</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{product.totalQuantity} adet</div>
                  <div className="text-sm text-gray-500">{formatCurrency(product.totalRevenue)}</div>
                  <div className="text-xs text-gray-400">Ort: {formatCurrency(product.averagePrice)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tüm Ürünler Tablosu */}
      <Card>
        <CardHeader>
          <CardTitle>Tüm Ürün Satışları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Ürün</th>
                  <th className="text-left p-2">Kategori</th>
                  <th className="text-right p-2">Adet</th>
                  <th className="text-right p-2">Gelir</th>
                  <th className="text-right p-2">Ort. Fiyat</th>
                  <th className="text-right p-2">Sipariş</th>
                </tr>
              </thead>
              <tbody>
                {data.productSales.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{product.name}</td>
                    <td className="p-2">
                      <Badge variant="outline">{product.category}</Badge>
                    </td>
                    <td className="p-2 text-right">{product.totalQuantity}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(product.totalRevenue)}</td>
                    <td className="p-2 text-right text-sm">{formatCurrency(product.averagePrice)}</td>
                    <td className="p-2 text-right">{product.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
