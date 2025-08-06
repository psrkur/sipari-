"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { API_ENDPOINTS } from '@/lib/api';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface BackupStats {
  lastBackup: string;
  totalBackups: number;
  successRate: number;
  databaseType: string;
}

interface BackupFile {
  timestamp: string;
  filename: string;
  size: number;
  type: string;
  success: boolean;
}

export default function BackupManagement() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const fetchBackupStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.ADMIN_BACKUP_STATS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackupStats(response.data);
    } catch (error) {
      console.error('Backup stats hatası:', error);
      toast.error('Backup istatistikleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupFiles = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_BACKUP_LIST, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackupFiles(response.data);
    } catch (error) {
      console.error('Backup dosyaları hatası:', error);
      toast.error('Backup dosyaları yüklenemedi');
    }
  };

  const createBackup = async () => {
    try {
      setCreatingBackup(true);
      const response = await axios.post(API_ENDPOINTS.ADMIN_BACKUP_CREATE, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Yedekleme başarıyla oluşturuldu');
      fetchBackupStats();
      fetchBackupFiles();
    } catch (error) {
      console.error('Backup oluşturma hatası:', error);
      toast.error('Yedekleme oluşturulamadı');
    } finally {
      setCreatingBackup(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.ADMIN_BACKUP_DOWNLOAD}/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Yedek dosyası indirildi');
    } catch (error) {
      console.error('Backup indirme hatası:', error);
      toast.error('Yedek dosyası indirilemedi');
    }
  };

  useEffect(() => {
    fetchBackupStats();
    fetchBackupFiles();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Database className="h-6 w-6 mr-2 text-blue-600" />
                Yedekleme Yönetimi
              </h1>
              <p className="text-gray-600 mt-1">
                Veritabanı yedeklerini oluşturun ve yönetin
              </p>
            </div>
            <Button
              onClick={createBackup}
              disabled={creatingBackup}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creatingBackup ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Yedekleniyor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Yeni Yedek Oluştur
                </>
              )}
            </Button>
          </div>
        </div>

        {/* İstatistikler */}
        {backupStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Son Yedekleme</p>
                    <p className="text-lg font-semibold">
                      {formatDate(backupStats.lastBackup)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Toplam Yedek</p>
                    <p className="text-lg font-semibold">{backupStats.totalBackups}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Başarı Oranı</p>
                    <p className="text-lg font-semibold">{backupStats.successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">Veritabanı Tipi</p>
                    <p className="text-lg font-semibold">{backupStats.databaseType}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Yedek Dosyaları */}
        <Card>
          <CardHeader>
            <CardTitle>Yedek Dosyaları</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Yedek dosyaları yükleniyor...</p>
              </div>
            ) : backupFiles.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Henüz yedek dosyası bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {backupFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      {file.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{file.filename}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(file.timestamp)} • {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadBackup(file.filename)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      İndir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 