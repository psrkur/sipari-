'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Trash2, Check } from 'lucide-react';

interface Image {
  filename: string;
  path: string;
  size: number;
  uploadedAt: string;
}

interface ImageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imagePath: string) => void;
  selectedImage?: string;
}

export default function ImageSelector({ isOpen, onClose, onSelect, selectedImage }: ImageSelectorProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

    const fetchImages = async () => {
    try {
      setLoading(true);
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error: any) {
          console.error('Auth storage parse error:', error);
        }
      }

      console.log('🔍 GET_IMAGES endpoint:', API_ENDPOINTS.GET_IMAGES);
      console.log('🔍 Auth token:', authToken ? 'Mevcut' : 'Yok');
      console.log('🔍 API_BASE_URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
      console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

      // Test isteği - önce basit bir endpoint test edelim
      try {
        const baseUrl = API_ENDPOINTS.GET_IMAGES.replace('/api/admin/images-public', '');
        const testResponse = await axios.get(`${baseUrl}/`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Backend erişilebilir:', testResponse.status);
      } catch (testError: any) {
        console.error('❌ Backend erişim sorunu:', testError.response?.status, testError.response?.data);
      }

      const response = await axios.get(API_ENDPOINTS.GET_IMAGES, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      console.log('✅ Resimler başarıyla yüklendi:', response.data);
      setImages(response.data);
    } catch (error: any) {
      console.error('❌ Resimler yüklenemedi:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error URL:', error.config?.url);
      console.error('❌ Error headers:', error.config?.headers);
      toast.error('Resimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yüklenebilir');
      return;
    }

    try {
      setUploading(true);
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error: any) {
          console.error('Auth storage parse error:', error);
        }
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(API_ENDPOINTS.UPLOAD_IMAGE, formData, {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Resim başarıyla yüklendi');
      fetchImages(); // Resim listesini yenile
    } catch (error: any) {
      console.error('Resim yükleme hatası:', error);
      toast.error('Resim yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (filename: string) => {
    try {
      let authToken = token;
      if (!authToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            authToken = parsed.state?.token;
          }
        } catch (error: any) {
          console.error('Auth storage parse error:', error);
        }
      }

      await axios.delete(API_ENDPOINTS.DELETE_IMAGE(filename), {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      toast.success('Resim silindi');
      fetchImages(); // Resim listesini yenile
    } catch (error: any) {
      console.error('Resim silme hatası:', error);
      toast.error('Resim silinemedi');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">🖼️ Resim Seçici</h2>
          <Button onClick={onClose} variant="outline" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Upload Section */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button disabled={uploading} className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                {uploading ? 'Yükleniyor...' : 'Resim Yükle'}
              </Button>
            </label>
            <p className="text-sm text-gray-600">
              Maksimum dosya boyutu: 5MB
            </p>
          </div>
        </div>

        {/* Images Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Resimler yükleniyor...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Henüz resim yüklenmemiş</p>
              <p className="text-sm text-gray-400 mt-1">Resim yüklemek için yukarıdaki butonu kullanın</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <Card key={image.filename} className="relative group">
                  <CardContent className="p-2">
                    <div className="relative">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${image.path}`}
                        alt={image.filename}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-image.svg';
                        }}
                      />
                      
                      {/* Selection Overlay */}
                      {selectedImage === image.path && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-50 flex items-center justify-center rounded-lg">
                          <Check className="h-8 w-8 text-white" />
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onSelect(image.path)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteImage(image.filename)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 truncate">{image.filename}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {formatFileSize(image.size)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {images.length} resim yüklü
            </p>
            <Button onClick={onClose} variant="outline">
              Kapat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 