'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_ENDPOINTS, handleImageError } from '@/lib/api';
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

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Resimler yükleniyor...');
      
      // Önce localStorage'dan resimleri yükle
      const savedImages = localStorage.getItem('uploaded-images');
      let localImages: Image[] = [];
      
      if (savedImages) {
        try {
          localImages = JSON.parse(savedImages);
          console.log('✅ localStorage\'dan resimler yüklendi:', localImages.length);
        } catch (error) {
          console.error('❌ localStorage parse hatası:', error);
        }
      }
      
      // API'den resimleri yüklemeyi dene
      try {
        console.log('🔍 API\'den resimler yükleniyor...');
        const response = await axios.get(API_ENDPOINTS.GET_IMAGES, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        if (Array.isArray(response.data)) {
          // API resimleri ile localStorage resimlerini birleştir
          const allImages = [...localImages, ...response.data];
          setImages(allImages);
          console.log('✅ Tüm resimler yüklendi, sayı:', allImages.length);
        } else {
          setImages(localImages);
          console.log('✅ Sadece localStorage resimleri yüklendi:', localImages.length);
        }
      } catch (error: any) {
        console.error('❌ API resimleri yüklenemedi:', error);
        // API başarısız olursa sadece localStorage resimlerini göster
        setImages(localImages);
        console.log('✅ Sadece localStorage resimleri yüklendi:', localImages.length);
        
        if (localImages.length === 0) {
          // Hiç resim yoksa fallback resimleri göster
          const fallbackImages = [
            { 
              filename: 'Ayvalık Tostu', 
              path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 
              size: 95, 
              uploadedAt: new Date().toISOString() 
            },
            { 
              filename: 'Köfte Ekmek', 
              path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 
              size: 95, 
              uploadedAt: new Date().toISOString() 
            },
            { 
              filename: 'Coca-Cola 2.5 lt', 
              path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 
              size: 95, 
              uploadedAt: new Date().toISOString() 
            },
            { 
              filename: 'Fanta 330 ml', 
              path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 
              size: 95, 
              uploadedAt: new Date().toISOString() 
            },
            { 
              filename: 'Sanayi Tostu', 
              path: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 
              size: 95, 
              uploadedAt: new Date().toISOString() 
            }
          ];
          setImages(fallbackImages);
          console.log('✅ Fallback resimler yüklendi:', fallbackImages.length);
        }
      }
    } catch (error: any) {
      console.error('❌ Resim yükleme hatası:', error);
      toast.error('Resimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen, fetchImages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 handleFileUpload çağrıldı');
    console.log('🔍 Event:', event);
    console.log('🔍 Files:', event.target.files);
    
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ Dosya seçilmedi');
      return;
    }
    
    console.log('✅ Dosya seçildi:', file.name, file.size, file.type);

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
      
      // Base64'e çevir
      console.log('🔍 Resim base64\'e çevriliyor');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result as string;
          console.log('✅ Base64 dönüşümü tamamlandı');
          
          // Base64 resmi doğrudan kullan
          const imageInfo = {
            filename: file.name,
            path: base64Data,
            size: file.size,
            uploadedAt: new Date().toISOString()
          };
          
          console.log('✅ Resim bilgisi oluşturuldu:', imageInfo);
          
          // Resim listesine ekle
          const newImages = [imageInfo, ...images];
          setImages(newImages);
          
          // localStorage'a kaydet
          try {
            localStorage.setItem('uploaded-images', JSON.stringify(newImages));
            console.log('✅ Resim localStorage\'a kaydedildi');
          } catch (error) {
            console.error('❌ localStorage kaydetme hatası:', error);
          }
          
          toast.success('Resim başarıyla yüklendi ve kaydedildi');
          
        } catch (error: any) {
          console.error('Base64 işleme hatası:', error);
          toast.error('Resim işlenemedi: ' + error.message);
        } finally {
          setUploading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('❌ Dosya okuma hatası');
        toast.error('Dosya okunamadı');
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error: any) {
      console.error('Resim yükleme hatası:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      toast.error('Resim yüklenemedi: ' + (error.response?.data?.error || error.message));
      setUploading(false);
    }
  };

  const handleDeleteImage = async (filename: string) => {
    try {
      console.log('🔍 Resim siliniyor:', filename);
      
      // Önce localStorage'dan sil
      const currentImages = images.filter(img => img.filename !== filename);
      setImages(currentImages);
      
      // localStorage'ı güncelle
      try {
        localStorage.setItem('uploaded-images', JSON.stringify(currentImages));
        console.log('✅ Resim localStorage\'dan silindi');
      } catch (error) {
        console.error('❌ localStorage güncelleme hatası:', error);
      }
      
      // API'den silmeyi dene (opsiyonel)
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
        
        if (authToken) {
          await axios.delete(API_ENDPOINTS.DELETE_IMAGE(filename), {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 10000
          });
          console.log('✅ API\'den de silindi:', filename);
        }
      } catch (error: any) {
        console.log('⚠️ API\'den silme başarısız (localStorage\'dan silindi):', error);
      }
      
      toast.success('Resim silindi');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
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
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
              id="image-upload"
            />
            <label 
              htmlFor="image-upload" 
              className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => console.log('🔍 Label tıklandı!')}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Yükleniyor...' : 'Resim Yükle'}
            </label>
            <p className="text-sm text-gray-600">
              Maksimum dosya boyutu: 5MB
            </p>
          </div>
        </div>

                 {/* Images Grid */}
         <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
                         src={image.path.startsWith('data:image/') ? image.path : `${API_ENDPOINTS.IMAGE_URL(image.path)}`}
                         alt={image.filename}
                         className="w-full h-32 object-cover rounded-lg bg-gray-100"
                         onError={handleImageError}
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