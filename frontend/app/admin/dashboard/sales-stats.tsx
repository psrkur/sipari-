'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart,
  Calendar,
  BarChart3,
  PieChart,
  Users,
  Building,
  Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { getApiBaseUrl } from '@/lib/api';
import { safeObjectEntries, safeObjectKeys } from '@/lib/utils';

interface SalesStatsData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalRevenue: number;
    orderCount: number;
    averageOrder: number;
  };
  platformStats: {
    [key: string]: {
      count: number;
      revenue: number;
    };
  };
  orderTypeStats: {
    [key: string]: {
      count: number;
      revenue: number;
    };
  };
  branchStats: {
    [key: string]: {
      count: number;
      revenue: number;
    };
  };
  sales: Array<{
    id: number;
    orderNumber: string;
    totalAmount: number;
    orderType: string;
    platform: string | null;
    createdAt: string;
    branch: {
      id: number;
      name: string;
    };
    customer: {
      id: number;
      name: string;
      phone: string;
    } | null;
  }>;
}

export default function SalesStats() {
  const [data, setData] = useState<SalesStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const { token } = useAuthStore();
  const API_BASE_URL = getApiBaseUrl();

  // Bugünün tarihini varsayılan olarak ayarla
  useEffect(() => {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    setEndDate(formattedToday);
    
    // Varsayılan olarak bugünün başlangıcını ayarla
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    setStartDate(startOfDay.toISOString().split('T')[0]);
  }, []);

  const loadSalesStats = async () => {
    try {
      setLoading(true);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // API parametrelerini hazırla
      const params = new URLSearchParams();
      params.append('period', period);
      
      if (useCustomDate && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/admin/sales-stats?${params.toString()}`, { headers });
      setData(response.data);

      console.log('📊 Satış istatistikleri yüklendi:', response.data);
    } catch (error: any) {
      console.error('Satış istatistikleri yüklenemedi:', error);
      
      if (error.response?.status === 401) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else if (error.response?.status === 403) {
        toast.error('Bu sayfaya erişim yetkiniz yok.');
      } else {
        toast.error('Satış istatistikleri yüklenemedi.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadSalesStats();
  }, [token, period, startDate, endDate, useCustomDate]);

  const handleDateFilter = () => {
    if (!startDate || !endDate) {
      toast.error('Lütfen başlangıç ve bitiş tarihlerini seçin.');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Başlangıç tarihi bitiş tarihinden büyük olamaz.');
      return;
    }
    
    setUseCustomDate(true);
    loadSalesStats();
  };

  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setPeriod(newPeriod);
    setUseCustomDate(false);
  };

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
    if (useCustomDate && startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    
    switch (period) {
      case 'daily':
        return 'Bugün';
      case 'weekly':
        return 'Bu Hafta';
      case 'monthly':
        return 'Bu Ay';
      default:
        return 'Bugün';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="text-center text-gray-500">
          Satış verileri yüklenemedi.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zaman Aralığı Seçimi */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Satış İstatistikleri</h2>
        <div className="flex space-x-2">
          <Button
            variant={period === 'daily' && !useCustomDate ? 'default' : 'outline'}
            onClick={() => handlePeriodChange('daily')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Günlük
          </Button>
          <Button
            variant={period === 'weekly' && !useCustomDate ? 'default' : 'outline'}
            onClick={() => handlePeriodChange('weekly')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Haftalık
          </Button>
          <Button
            variant={period === 'monthly' && !useCustomDate ? 'default' : 'outline'}
            onClick={() => handlePeriodChange('monthly')}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Aylık
          </Button>
        </div>
      </div>

      {/* Tarih Seçici */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            Tarih Aralığı Seçimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Tarihi
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleDateFilter}
              disabled={!startDate || !endDate}
              className="w-full sm:w-auto"
            >
              <Search className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          </div>
          {useCustomDate && (
            <div className="mt-2 text-sm text-blue-600">
              Özel tarih aralığı kullanılıyor: {getPeriodText()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tarih Aralığı */}
      <div className="text-sm text-gray-600">
        {getPeriodText()}
      </div>

      {/* Ana Metrikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Toplam Satış */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Satış</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPeriodText()} toplam satış tutarı
            </p>
          </CardContent>
        </Card>

        {/* Sipariş Sayısı */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sipariş Sayısı</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.orderCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPeriodText()} toplam sipariş
            </p>
          </CardContent>
        </Card>

        {/* Ortalama Sipariş */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Sipariş</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.averageOrder)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sipariş başına ortalama
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detaylı İstatistikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Bazında Dağılım */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Platform Bazında Satışlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.platformStats && typeof data.platformStats === 'object' && safeObjectEntries(data.platformStats).map(([platform, stats]) => (
                <div key={platform} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{platform}</div>
                    <div className="text-sm text-gray-600">{stats.count} sipariş</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(stats.revenue)}</div>
                    <div className="text-sm text-gray-600">
                      %{data.summary && data.summary.totalRevenue ? ((stats.revenue / data.summary.totalRevenue) * 100).toFixed(1) : '0.0'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sipariş Tipi Bazında Dağılım */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Sipariş Tipi Bazında Satışlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.orderTypeStats && typeof data.orderTypeStats === 'object' && safeObjectEntries(data.orderTypeStats).map(([type, stats]) => (
                <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">
                      {type === 'DELIVERY' ? 'Teslimat' : type === 'TABLE' ? 'Masa' : type}
                    </div>
                    <div className="text-sm text-gray-600">{stats.count} sipariş</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(stats.revenue)}</div>
                    <div className="text-sm text-gray-600">
                      %{data.summary && data.summary.totalRevenue ? ((stats.revenue / data.summary.totalRevenue) * 100).toFixed(1) : '0.0'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Şube Bazında Dağılım */}
      {data.branchStats && typeof data.branchStats === 'object' && safeObjectKeys(data.branchStats).length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Şube Bazında Satışlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeObjectEntries(data.branchStats).map(([branchName, stats]) => (
                <div key={branchName} className="p-4 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">{branchName}</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.revenue)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stats.count} sipariş
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Son Satışlar */}
      <Card>
        <CardHeader>
          <CardTitle>Son Satışlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.sales && Array.isArray(data.sales) && data.sales.length > 0 ? (
              data.sales.slice(0, 10).map((sale) => (
                <div key={sale.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{sale.orderNumber}</div>
                    <div className="text-sm text-gray-600">
                      {sale.customer?.name || 'Müşteri bilgisi yok'} • {sale.branch.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString('tr-TR')} {new Date(sale.createdAt).toLocaleTimeString('tr-TR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(sale.totalAmount)}</div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline">
                        {sale.orderType === 'DELIVERY' ? 'Teslimat' : sale.orderType === 'TABLE' ? 'Masa' : sale.orderType}
                      </Badge>
                      {sale.platform && (
                        <Badge variant="secondary">{sale.platform}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Henüz satış verisi bulunmuyor</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
