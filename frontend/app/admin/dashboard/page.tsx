'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useSocket } from '@/lib/socket';
import axios from 'axios';
import { API_ENDPOINTS, getApiBaseUrl } from '@/lib/api';
import toast from 'react-hot-toast';
import SalesStats from './sales-stats';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Clock,
  DollarSign,
  Star,
  AlertCircle,
  CheckCircle,
  Package,
  Truck,
  MessageCircle,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Zap,
  Eye,
  Heart,
  ThumbsUp
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardData {
  sales: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    target: number;
    percentage: number;
  };
  orders: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    delivered: number;
    cancelled: number;
    averageTime: number;
  };
  customers: {
    total: number;
    newToday: number;
    activeNow: number;
    averageRating: number;
    chatbotConversations: number;
  };
  products: {
    total: number;
    popular: Array<{
      name: string;
      sales: number;
      revenue: number;
    }>;
    lowStock: Array<{
      name: string;
      stock: number;
    }>;
  };
  realTime: {
    currentOrders: Array<{
      id: string;
      customerName: string;
      items: string;
      total: number;
      status: string;
      time: string;
    }>;
    recentActivity: Array<{
      type: string;
      message: string;
      time: string;
      icon: string;
    }>;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales-stats'>('dashboard');
  const { token } = useAuthStore();
  const { on, off } = useSocket();
  const API_BASE_URL = getApiBaseUrl();

  // Dashboard verilerini yükle
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Auth header'ı hazırla
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Dashboard API'den verileri çek
      const dashboardRes = await axios.get(API_ENDPOINTS.DASHBOARD_STATS, { headers });
      const dashboardData = dashboardRes.data;

      console.log('📊 Dashboard verileri yüklendi:', {
        sales: dashboardData.sales,
        orders: dashboardData.orders,
        customers: dashboardData.customers,
        products: dashboardData.products,
        realTime: dashboardData.realTime
      });

      setData(dashboardData);
      
      // Chart verilerini de yükle
      await loadChartData();
    } catch (error: any) {
      console.error('Dashboard verileri yüklenemedi:', error);
      
      // Daha detaylı hata mesajı
      if (error.response) {
        console.error('API Hatası:', error.response.status, error.response.data);
        if (error.response.status === 401) {
          toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        } else if (error.response.status === 403) {
          toast.error('Bu sayfaya erişim yetkiniz yok.');
        } else {
          toast.error(`API Hatası: ${error.response.status}`);
        }
      } else if (error.request) {
        console.error('Bağlantı Hatası:', error.request);
        toast.error('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        console.error('Genel Hata:', error.message);
        toast.error('Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Gerçek zamanlı güncellemeler
  useEffect(() => {
    if (!token) return;
    
    loadDashboardData();

    // Her 30 saniyede bir güncelle
    const interval = setInterval(loadDashboardData, 30000);

    // Socket.io ile gerçek zamanlı güncellemeler
    const handleNewOrder = () => {
      loadDashboardData();
      toast.success('Yeni sipariş alındı!');
    };

    const handleOrderStatusChanged = () => {
      loadDashboardData();
      toast.success('Sipariş durumu güncellendi!');
    };

    on('newOrder', handleNewOrder);
    on('orderStatusChanged', handleOrderStatusChanged);

    return () => {
      clearInterval(interval);
      off('newOrder', handleNewOrder);
      off('orderStatusChanged', handleOrderStatusChanged);
    };
  }, [token]); // Sadece token'ı dependency olarak kullan

  // Gerçek veri ile grafik verileri
  const [salesChartData, setSalesChartData] = useState({
    labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
    datasets: [
      {
        label: 'Günlük Satış (₺)',
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  });

  const [orderStatusData, setOrderStatusData] = useState({
    labels: ['Bekleyen', 'Hazırlanan', 'Hazır', 'Teslim Edilen', 'İptal Edilen'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 2,
      },
    ],
  });

  // Chart verilerini yükle
  const loadChartData = async () => {
    try {
      // Satış trendi verilerini yükle
      const salesTrendRes = await axios.get(API_ENDPOINTS.DASHBOARD_SALES_TREND, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (salesTrendRes.data) {
        setSalesChartData({
          labels: salesTrendRes.data.labels,
          datasets: [{
            label: 'Günlük Satış (₺)',
            data: salesTrendRes.data.datasets[0].data,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
          }],
        });
      }

      // Sipariş durumu verilerini yükle
      const orderStatusRes = await axios.get(API_ENDPOINTS.DASHBOARD_ORDER_STATUS, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (orderStatusRes.data) {
        setOrderStatusData({
          labels: orderStatusRes.data.labels,
          datasets: [{
            data: orderStatusRes.data.datasets[0].data,
            backgroundColor: [
              'rgba(255, 206, 86, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
              'rgba(255, 99, 132, 0.8)',
            ],
            borderColor: [
              'rgba(255, 206, 86, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 2,
          }],
        });
      }
    } catch (error) {
      console.error('Chart verileri yüklenemedi:', error);
      // Hata durumunda varsayılan veriler kullan
      setSalesChartData({
        labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
        datasets: [{
          label: 'Günlük Satış (₺)',
          data: [0, 0, 0, 0, 0, 0, 0],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        }],
      });
      
      setOrderStatusData({
        labels: ['Bekleyen', 'Hazırlanan', 'Hazır', 'Teslim Edilen', 'İptal Edilen'],
        datasets: [{
          data: [0, 0, 0, 0, 0],
          backgroundColor: [
            'rgba(255, 206, 86, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 99, 132, 0.8)',
          ],
          borderColor: [
            'rgba(255, 206, 86, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 2,
        }],
      });
    }
  };

  const popularProductsData = {
    labels: data?.products.popular.map(p => p.name) || [],
    datasets: [
      {
        label: 'Satış Adedi',
        data: data?.products.popular.map(p => p.sales) || [],
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex space-x-2">
            <div className="w-4 h-4 bg-orange-600 rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Dashboard verileri yüklenemedi</h3>
            <p className="text-sm text-gray-500 mb-4">Veritabanı bağlantısında sorun olabilir</p>
            <button 
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant={activeTab === 'sales-stats' ? 'default' : 'outline'}
            onClick={() => setActiveTab('sales-stats')}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Satış İstatistikleri
          </Button>
        </div>
        
        {activeTab === 'dashboard' && (
          <div className="flex space-x-2">
            <Button
              variant={timeRange === 'today' ? 'default' : 'outline'}
              onClick={() => setTimeRange('today')}
            >
              Bugün
            </Button>
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              onClick={() => setTimeRange('week')}
            >
              Bu Hafta
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              onClick={() => setTimeRange('month')}
            >
              Bu Ay
            </Button>
          </div>
        )}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'sales-stats' ? (
        <SalesStats />
      ) : (
        <>

      {/* Ana Metrikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Satış */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Satış</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
                         <div className="text-2xl font-bold">
               {(data.sales?.today || 0).toLocaleString('tr-TR')} ₺
             </div>
            <div className="flex items-center space-x-2">
              {data.sales.percentage >= 100 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
                             <p className={`text-xs ${(data.sales?.percentage || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                 Hedefin %{data.sales?.percentage || 0}'i
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Siparişler */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Siparişler</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
                         <div className="text-2xl font-bold">
               {(data.orders?.pending || 0) + (data.orders?.preparing || 0)}
             </div>
            <p className="text-xs text-gray-600">
              Ortalama hazırlama: {data.orders?.averageTime || 0} dk
            </p>
          </CardContent>
        </Card>

        {/* Müşteriler */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Müşteriler</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
                         <div className="text-2xl font-bold">{data.customers?.activeNow || 0}</div>
            <p className="text-xs text-gray-600">
              Ortalama puan: {data.customers?.averageRating || 0} ⭐
            </p>
          </CardContent>
        </Card>

        {/* Chatbot */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chatbot Sohbetleri</CardTitle>
            <MessageCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
                         <div className="text-2xl font-bold">{data.customers?.chatbotConversations || 0}</div>
                         <p className="text-xs text-gray-600">
               Bugün aktif sohbetler
             </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Satış Grafiği */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Haftalık Satış Trendi</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesChartData.datasets[0].data.some(value => value > 0) ? (
              <Line 
                data={salesChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Günlük Satış Grafiği',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                <p>Henüz satış verisi bulunmuyor</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sipariş Durumu Grafiği */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Sipariş Durumu Dağılımı</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
                         {orderStatusData.datasets[0].data.some(value => value > 0) ? (
               <Doughnut 
                 data={orderStatusData}
                 options={{
                   responsive: true,
                   plugins: {
                     legend: {
                       position: 'bottom' as const,
                     },
                     title: {
                       display: true,
                       text: 'Sipariş Durumu',
                     },
                   },
                 }}
               />
             ) : (
               <div className="text-center text-gray-500 py-8">
                 <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                 <p>Henüz sipariş durumu verisi bulunmuyor</p>
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Detaylı Metrikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sipariş Durumu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Sipariş Durumu</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Bekleyen</span>
                </div>
                <Badge variant="secondary">{data.orders.pending || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Hazırlanan</span>
                </div>
                <Badge variant="secondary">{data.orders.preparing || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Hazır</span>
                </div>
                <Badge variant="secondary">{data.orders.ready || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Teslim Edilen</span>
                </div>
                <Badge variant="secondary">{data.orders.delivered || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>İptal Edilen</span>
                </div>
                <Badge variant="secondary">{data.orders.cancelled || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popüler Ürünler Grafiği */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>En Popüler Ürünler</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
                         {data.products.popular && data.products.popular.length > 0 ? (
               <Bar 
                 data={popularProductsData}
                 options={{
                   responsive: true,
                   plugins: {
                     legend: {
                       position: 'top' as const,
                     },
                     title: {
                       display: true,
                       text: 'Satış Adedi',
                     },
                   },
                   scales: {
                     y: {
                       beginAtZero: true,
                     },
                   },
                 }}
               />
             ) : (
               <div className="text-center text-gray-500 py-8">
                 <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                 <p>Henüz popüler ürün bulunmuyor</p>
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Gerçek Zamanlı Veriler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canlı Siparişler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Canlı Siparişler</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
                             {data.realTime.currentOrders && data.realTime.currentOrders.length > 0 ? (
                data.realTime.currentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{order.customerName}</span>
                        <Badge variant={
                          order.status === 'PENDING' ? 'secondary' :
                          order.status === 'PREPARING' ? 'default' :
                          order.status === 'READY' ? 'outline' : 'destructive'
                        }>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{order.items}</p>
                      <p className="text-xs text-gray-500">{order.time}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{order.total} ₺</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                  <p>Henüz sipariş bulunmuyor</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Son Aktiviteler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span>Son Aktiviteler</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
                             {data.realTime.recentActivity && data.realTime.recentActivity.length > 0 ? (
                data.realTime.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {activity.icon === 'ShoppingCart' && <ShoppingCart className="h-4 w-4 text-blue-600" />}
                      {activity.icon === 'Users' && <Users className="h-4 w-4 text-blue-600" />}
                      {activity.icon === 'MessageCircle' && <MessageCircle className="h-4 w-4 text-blue-600" />}
                      {activity.icon === 'Truck' && <Truck className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                  <p>Henüz aktivite bulunmuyor</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
} 