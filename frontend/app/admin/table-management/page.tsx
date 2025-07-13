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
  Table as TableIcon
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
}

interface QRCodeData {
  table: Table;
  qrCode: string;
  qrUrl: string;
}

export default function TableManagement() {
  const { user, token } = useAuthStore();
  const [tables, setTables] = useState<Table[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  
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

  const handleAddTable = async () => {
    if (!newTableNumber.trim() || !selectedBranchForNew) {
      toast.error('Masa numarası ve şube seçimi gerekli');
      return;
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.ADMIN_TABLES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          number: newTableNumber.trim(),
          branchId: selectedBranchForNew
        })
      });

      toast.success('Masa eklendi');
      setNewTableNumber('');
      setSelectedBranchForNew(null);
      setShowAddForm(false);
      loadTables();
    } catch (error: any) {
      console.error('Masa ekleme hatası:', error);
      toast.error(error.message || 'Masa eklenemedi');
    }
  };

  const handleUpdateTable = async (table: Table) => {
    try {
      await apiRequest(API_ENDPOINTS.ADMIN_UPDATE_TABLE(table.id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          number: table.number,
          isActive: table.isActive
        })
      });

      toast.success('Masa güncellendi');
      setEditingTable(null);
      loadTables();
    } catch (error: any) {
      console.error('Masa güncelleme hatası:', error);
      toast.error(error.message || 'Masa güncellenemedi');
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!confirm('Bu masayı silmek istediğinizden emin misiniz?')) {
      return;
    }

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
      console.error('Masa silme hatası:', error);
      toast.error(error.message || 'Masa silinemedi');
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
    } catch (error: any) {
      console.error('QR kod oluşturma hatası:', error);
      toast.error(error.message || 'QR kod oluşturulamadı');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeData) return;
    
    const link = document.createElement('a');
    link.href = qrCodeData.qrCode;
    link.download = `qr-table-${qrCodeData.table.number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Yetkisiz Erişim</h1>
          <p className="text-gray-600 mt-2">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TableIcon className="h-8 w-8" />
            Masa Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">Şubelerdeki masaları yönetin ve QR kodları oluşturun</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Yeni Masa Ekle
        </Button>
      </div>

      {/* Şube Filtresi */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Şube Filtresi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={selectedBranch === null ? "default" : "outline"}
              onClick={() => setSelectedBranch(null)}
            >
              Tüm Şubeler
            </Button>
            {branches.map((branch) => (
              <Button
                key={branch.id}
                variant={selectedBranch === branch.id ? "default" : "outline"}
                onClick={() => setSelectedBranch(branch.id)}
              >
                {branch.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Yeni Masa Ekleme Formu */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Yeni Masa Ekle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Şube</label>
                <select
                  value={selectedBranchForNew || ''}
                  onChange={(e) => setSelectedBranchForNew(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Şube seçin</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Masa Numarası</label>
                <Input
                  value={newTableNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTableNumber(e.target.value)}
                  placeholder="Örn: A1, B3, 5"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleAddTable} disabled={!newTableNumber.trim() || !selectedBranchForNew}>
                  Ekle
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  İptal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Masalar Listesi */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Masalar yükleniyor...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TableIcon className="h-5 w-5" />
                    Masa {table.number}
                  </CardTitle>
                  <Badge variant={table.isActive ? "default" : "secondary"}>
                    {table.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{table.branch.name}</p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTable(table)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateQRCode(table.id)}
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteTable(table.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Kod Modal */}
      {showQRModal && qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              QR Kod - Masa {qrCodeData.table.number}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {qrCodeData.table.branch.name}
            </p>
            
            <div className="text-center mb-4">
              <img 
                src={qrCodeData.qrCode} 
                alt="QR Code" 
                className="mx-auto border"
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={downloadQRCode} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                İndir
              </Button>
              <Button variant="outline" onClick={() => setShowQRModal(false)} className="flex-1">
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme Modal */}
      {editingTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">
              Masa Düzenle - {editingTable.number}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Masa Numarası</label>
                <Input
                  value={editingTable.number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTable({
                    ...editingTable,
                    number: e.target.value
                  })}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingTable.isActive}
                  onChange={(e) => setEditingTable({
                    ...editingTable,
                    isActive: e.target.checked
                  })}
                />
                <label htmlFor="isActive">Aktif</label>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={() => handleUpdateTable(editingTable)} className="flex-1">
                Güncelle
              </Button>
              <Button variant="outline" onClick={() => setEditingTable(null)} className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 