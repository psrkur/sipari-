'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { API_ENDPOINTS, apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  QrCode, 
  Download,
  Building,
  Table as TableIcon,
  DollarSign,
  RefreshCw,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface Table {
  id: number;
  number: string;
  branchId: number;
  isActive: boolean;
  branch: {
    id: number;
    name: string;
  };
}

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

interface QRCodeData {
  table: Table;
  qrCode: string;
  qrUrl: string;
}

interface TableOrders {
  table: Table;
  orders: any[];
  totalAmount: number;
  orderCount: number;
}

export default function TableManagement() {
  const { user, token } = useAuthStore();
  const [tables, setTables] = useState<Table[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTableOrders, setSelectedTableOrders] = useState<TableOrders | null>(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [collectionNotes, setCollectionNotes] = useState('');
  
  // Form state
  const [newTableNumber, setNewTableNumber] = useState('');
  const [selectedBranchForNew, setSelectedBranchForNew] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      toast.error('Bu sayfaya erişim yetkiniz yok');
      return;
    }
    
    loadBranches();
    loadTables();
  }, [user]);

  // Şube filtresi değiştiğinde masaları yeniden yükle
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      loadTables();
    }
  }, [selectedBranch]);

  const loadBranches = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.BRANCHES);
      setBranches(response);
    } catch (error) {
      console.error('Şubeler yüklenemedi:', error);
      toast.error('Şubeler yüklenemedi');
    }
  };

  const loadTables = async () => {
    try {
      setLoading(true);
      const url = selectedBranch 
        ? API_ENDPOINTS.ADMIN_TABLES_BY_BRANCH(selectedBranch)
        : API_ENDPOINTS.ADMIN_TABLES;
      
      const response = await apiRequest(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTables(response);
    } catch (error) {
      console.error('Masalar yüklenemedi:', error);
      toast.error('Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadTableOrders = async (tableId: number) => {
    try {
      const url = API_ENDPOINTS.ADMIN_TABLE_ORDERS(tableId);
      console.log('🔍 API URL:', url);
      console.log('🔍 Table ID:', tableId);
      console.log('🔍 Token:', token ? 'Mevcut' : 'Yok');
      
      const response = await apiRequest(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ API Response:', response);
      setSelectedTableOrders(response);
      setShowOrdersModal(true);
    } catch (error) {
      console.error('❌ Masa siparişleri yüklenemedi:', error);
      toast.error('Masa siparişleri yüklenemedi');
    }
  };

  const collectPayment = async (tableId: number) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_TABLE_COLLECT(tableId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod,
          notes: collectionNotes
        })
      });

      // Başarılı tahsilat mesajı
      const successMessage = response.message || `Masa ${selectedTableOrders?.table.number} için tahsilat tamamlandı ve masa sıfırlandı!`;
      toast.success(successMessage, {
        duration: 4000,
        description: `Ödeme yöntemi: ${paymentMethod === 'CASH' ? 'Nakit' : paymentMethod === 'CARD' ? 'Kart' : 'Online'}`
      });

      // Modal'ları kapat
      setShowCollectionModal(false);
      setShowOrdersModal(false);
      setSelectedTableOrders(null);
      
      // Form verilerini sıfırla
      setPaymentMethod('CASH');
      setCollectionNotes('');
      
      // Masaları yeniden yükle
      loadTables();
    } catch (error: any) {
      console.error('Tahsilat hatası:', error);
      toast.error(error.message || 'Tahsilat yapılamadı');
    }
  };

  const resetTable = async (tableId: number) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_TABLE_RESET(tableId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success(response.message);
      setShowOrdersModal(false);
      setSelectedTableOrders(null);
      
      // Masaları yeniden yükle
      loadTables();
    } catch (error: any) {
      console.error('Masa sıfırlama hatası:', error);
      toast.error(error.message || 'Masa sıfırlanamadı');
    }
  };

  const generateQRCode = async (tableId: number) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_TABLE_QR(tableId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setQrCodeData(response);
      setShowQRModal(true);
    } catch (error) {
      console.error('QR kod oluşturulamadı:', error);
      toast.error('QR kod oluşturulamadı');
    }
  };

  const addTable = async () => {
    if (!newTableNumber || !selectedBranchForNew) {
      toast.error('Masa numarası ve şube seçimi gerekli');
      return;
    }

    try {
      await apiRequest(API_ENDPOINTS.ADMIN_TABLES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: newTableNumber,
          branchId: selectedBranchForNew
        })
      });

      toast.success('Masa eklendi');
      setNewTableNumber('');
      setSelectedBranchForNew(null);
      setShowAddForm(false);
      loadTables();
    } catch (error: any) {
      toast.error(error.message || 'Masa eklenemedi');
    }
  };

  const deleteTable = async (tableId: number) => {
    if (!confirm('Bu masayı silmek istediğinizden emin misiniz?')) return;

    try {
      await apiRequest(API_ENDPOINTS.ADMIN_DELETE_TABLE(tableId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success('Masa silindi');
      loadTables();
    } catch (error: any) {
      toast.error(error.message || 'Masa silinemedi');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Masalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Masa Yönetimi</h1>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Masa Ekle
          </Button>
        </div>

        {/* Şube Filtresi */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Şube Filtresi
          </label>
          <select
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : null)}
            className="border border-gray-300 rounded-md px-3 py-2 w-full max-w-xs"
          >
            <option value="">Tüm Şubeler</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Masalar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <Card key={table.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <TableIcon className="w-5 h-5 mr-2" />
                      Masa {table.number}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {table.branch.name}
                    </p>
                  </div>
                  <Badge variant={table.isActive ? "default" : "secondary"}>
                    {table.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadTableOrders(table.id)}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Siparişleri Gör
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateQRCode(table.id)}
                    className="w-full"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Kod
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTable(table);
                        setShowAddForm(true);
                      }}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTable(table.id)}
                      className="flex-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Yeni Masa Ekleme Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingTable ? 'Masa Düzenle' : 'Yeni Masa Ekle'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Masa Numarası
                  </label>
                  <Input
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="A1, B3, vb."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şube
                  </label>
                  <select
                    value={selectedBranchForNew || ''}
                    onChange={(e) => setSelectedBranchForNew(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                  >
                    <option value="">Şube Seçin</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex space-x-3">
                  <Button onClick={addTable} className="flex-1">
                    {editingTable ? 'Güncelle' : 'Ekle'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingTable(null);
                      setNewTableNumber('');
                      setSelectedBranchForNew(null);
                    }}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Kod Modal */}
        {showQRModal && qrCodeData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  QR Kod - Masa {qrCodeData.table.number}
                </h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="text-center">
                <img
                  src={qrCodeData.qrCode}
                  alt="QR Code"
                  className="mx-auto mb-4"
                />
                <p className="text-sm text-gray-600 mb-4">
                  Bu QR kodu masaya yerleştirin
                </p>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCodeData.qrCode;
                    link.download = `qr-masa-${qrCodeData.table.number}.png`;
                    link.click();
                  }}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  QR Kodu İndir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Masa Siparişleri Modal */}
        {showOrdersModal && selectedTableOrders && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Masa {selectedTableOrders.table.number} Siparişleri
                </h3>
                <button
                  onClick={() => setShowOrdersModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedTableOrders.orderCount}
                      </div>
                      <div className="text-sm text-gray-600">Sipariş</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ₺{selectedTableOrders.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Toplam</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        ₺{(selectedTableOrders.totalAmount / selectedTableOrders.orderCount).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Ortalama</div>
                    </div>
                  </div>
                </div>

                {selectedTableOrders.orders.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Sipariş Detayları:</h4>
                    {selectedTableOrders.orders.map((order, index) => (
                      <div key={order.id} className="border p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleString('tr-TR')}
                            </div>
                            <div className="text-sm text-gray-600">
                              Durum: {order.status}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">₺{order.totalAmount.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        {order.orderItems && order.orderItems.length > 0 && (
                          <div className="mt-2 text-sm">
                            <div className="font-medium mb-1">Ürünler:</div>
                            {order.orderItems.map((item: any, itemIndex: number) => (
                              <div key={itemIndex} className="flex justify-between text-gray-600">
                                <span>{item.product.name} x{item.quantity}</span>
                                <span>₺{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Bu masada henüz sipariş yok
                  </div>
                )}

                {selectedTableOrders.orders.length > 0 && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button
                      onClick={() => setShowCollectionModal(true)}
                      className="flex-1"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Tahsilat Yap
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resetTable(selectedTableOrders.table.id)}
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Masayı Sıfırla
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tahsilat Modal */}
        {showCollectionModal && selectedTableOrders && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  💰 Tahsilat - Masa {selectedTableOrders.table.number}
                </h3>
                <button
                  onClick={() => setShowCollectionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">
                    ₺{selectedTableOrders.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Tahsilat Tutarı</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedTableOrders.orderCount} sipariş • {selectedTableOrders.orders.length} adet ürün
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💳 Ödeme Yöntemi
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                  >
                    <option value="CASH">💵 Nakit</option>
                    <option value="CARD">💳 Kart</option>
                    <option value="ONLINE">🌐 Online</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📝 Not (Opsiyonel)
                  </label>
                  <Input
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                    placeholder="Tahsilat notu..."
                  />
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>ℹ️ Bilgi:</strong> Tahsilat tamamlandıktan sonra masa otomatik olarak sıfırlanacak ve tüm siparişler kapatılacaktır.
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => collectPayment(selectedTableOrders.table.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    ✅ Tahsilatı Tamamla
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCollectionModal(false)}
                    className="flex-1"
                  >
                    ❌ İptal
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 