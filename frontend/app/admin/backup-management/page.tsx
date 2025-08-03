'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Database, 
  Clock, 
  HardDrive,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface BackupStatus {
  lastBackup: string | null;
  totalBackups: number;
  successRate: number;
  databaseType: string;
}

interface BackupFile {
  filename: string;
  size: string;
  created: string;
  type: string;
}

interface BackupStats {
  totalBackups: number;
  successRate: number;
  lastBackup: string | null;
  totalSize: number;
  averageSize: number;
}

const BackupManagement = () => {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, backupsRes, statsRes] = await Promise.all([
        axios.get('/api/backup/status'),
        axios.get('/api/backup/list'),
        axios.get('/api/backup/stats')
      ]);

      setStatus(statusRes.data.data);
      setBackups(backupsRes.data.data.backups);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Yedekleme verileri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerBackup = async () => {
    try {
      setTriggering(true);
      await axios.post('/api/backup/trigger');
      await fetchData();
      alert('Yedekleme başarıyla tamamlandı!');
    } catch (error) {
      console.error('Yedekleme hatası:', error);
      alert('Yedekleme işlemi başarısız!');
    } finally {
      setTriggering(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const response = await axios.get(`/api/backup/download/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('İndirme hatası:', error);
      alert('Yedek indirilemedi!');
    }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm(`${filename} dosyasını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await axios.delete(`/api/backup/delete/${filename}`);
      await fetchData();
      alert('Yedek başarıyla silindi!');
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Yedek silinemedi!');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const getStatusColor = (successRate: number) => {
    if (successRate >= 90) return 'bg-green-500';
    if (successRate >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Yedekleme Yönetimi</h1>
        <Button 
          onClick={triggerBackup} 
          disabled={triggering}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {triggering ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Database className="w-4 h-4 mr-2" />
          )}
          Manuel Yedekleme
        </Button>
      </div>

      {/* Durum Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veritabanı Türü</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.databaseType || 'Bilinmiyor'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Yedek</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.totalBackups || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Başarı Oranı</CardTitle>
            <div className={`h-4 w-4 rounded-full ${getStatusColor(status?.successRate || 0)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.successRate || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Son Yedekleme</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {status?.lastBackup ? formatDate(status.lastBackup) : 'Hiç yedeklenmemiş'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* İstatistikler */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Yedekleme İstatistikleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Toplam Boyut</div>
                <div className="text-lg font-semibold">
                  {Math.round(stats.totalSize / 1024 / 1024 * 100) / 100} MB
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Ortalama Boyut</div>
                <div className="text-lg font-semibold">
                  {Math.round(stats.averageSize / 1024 / 1024 * 100) / 100} MB
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Başarı Oranı</div>
                <div className="text-lg font-semibold">{stats.successRate}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Toplam Yedek</div>
                <div className="text-lg font-semibold">{stats.totalBackups}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Yedek Listesi */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Yedek Dosyaları</CardTitle>
            <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Yükleniyor...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Henüz yedek dosyası bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{backup.filename}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(backup.created)} • {backup.size}
                        </div>
                      </div>
                    </div>
                    <Badge variant={backup.type === 'postgresql' ? 'default' : 'secondary'}>
                      {backup.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => downloadBackup(backup.filename)}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteBackup(backup.filename)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Otomatik Yedekleme Bilgisi */}
      <Card>
        <CardHeader>
          <CardTitle>Otomatik Yedekleme Ayarları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">Günlük Yedekleme</div>
                <div className="text-sm text-gray-500">Her gün saat 02:00</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium">Haftalık Yedekleme</div>
                <div className="text-sm text-gray-500">Her Pazar saat 03:00</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="font-medium">Yedek Saklama</div>
                <div className="text-sm text-gray-500">Günlük: 7 gün, Haftalık: 30 gün, Aylık: 90 gün</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement; 